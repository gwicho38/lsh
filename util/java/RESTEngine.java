/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

package c3.platform.service.rest;

import c3.C3;
import c3.Ctx;
import c3.platform.Context;
import c3.platform.Fail;
import c3.platform.action.Action;
import c3.platform.ann.Ann;
import c3.platform.config.Configurable;
import c3.platform.err.C3RuntimeException;
import c3.platform.err.Err;
import c3.platform.file.MediaType;
import c3.platform.http.HttpBinaryResponse;
import c3.platform.http.HttpMethod;
import c3.platform.http.HttpRequest;
import c3.platform.http.HttpResponseMetadata;
import c3.platform.java.Java;
import c3.platform.remote.http.CloseableHttpClient;
import c3.platform.remote.http.HttpClientBuilder;
import c3.platform.security.vault.Vault;
import c3.platform.typesys.type.Annotation;
import c3.platform.typesys.type.AnyType;
import c3.platform.typesys.type.ArrayType;
import c3.platform.typesys.type.FunctionParam;
import c3.platform.typesys.type.JsonType;
import c3.platform.typesys.type.MapType;
import c3.platform.typesys.type.Type;
import c3.platform.typesys.type.ValueType;
import c3.platform.typesys.util.If;
import c3.platform.typesys.util.Jsn;
import c3.platform.typesys.util.Logger;
import c3.platform.typesys.util.O;
import c3.platform.typesys.util.Str;
import c3.platform.typesys.util.Val;
import c3.platform.typesys.value.Array;
import c3.platform.typesys.value.ArrayMapBuilder;
import c3.platform.typesys.value.Boxed;
import c3.platform.typesys.value.Obj;
import c3.platform.typesys.value.Pair;
import c3.platform.typesys.value.json.JsonNode;
import c3.platform.typesys.value.protocol.DefaultInstance;
import c3.platform.typesys.value.serdeser.JsonSerDeser;
import c3.platform.vendor.google.GoogleApiUrlSigner;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.io.Writer;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import org.apache.commons.io.IOUtils;
import org.apache.http.Consts;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.ProtocolVersion;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.client.methods.HttpPatch;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.codehaus.stax2.XMLOutputFactory2;
import org.codehaus.stax2.io.EscapingWriterFactory;

/**
 * REST engine implements generic REST api proxy
 *
 * @author Gilberto Arnaiz
 * @author David T.
 */
public class RESTEngine {

   public static final String NAME = "c3.platform.service.rest.RESTEngine";
   public final static Logger log = Logger.for_(RESTEngine.class.getName());
   private static final int MAX_PER_ROUTE_DEFAULT = 50;
   // Only one HttpClient per endpoint
   private static Map<String, Pair<Integer, CloseableHttpClient>> httpClients =
         new HashMap<String, Pair<Integer, CloseableHttpClient>>();
   private static Map<String, Pair<Integer, CloseableHttpClient>> poolBoundHttpClients =
         new HashMap<String, Pair<Integer, CloseableHttpClient>>();
   private static ThreadLocal<Map<String, CloseableHttpClient>> threadHttpClients = new ThreadLocal<>();

   public static RESTEngine instance = new RESTEngine();

   private XMLOutputFactory xmlOutputFactory = XMLOutputFactory.newFactory();

   private class NoopEscapingWriterFactory implements EscapingWriterFactory {

      public Writer createEscapingWriterFor(final Writer out, String enc) throws UnsupportedEncodingException {
         return new Writer() {

            @Override
            public void write(char[] cbuf, int off, int len) throws IOException {
               // don't escape anything
               out.write(cbuf, off, len);
            }

            @Override
            public void flush() throws IOException {
               out.flush();
            }

            @Override
            public void close() throws IOException {
               out.close();
            }
         };
      }

      public Writer createEscapingWriterFor(OutputStream out, String enc) throws UnsupportedEncodingException {
         throw new IllegalArgumentException("Not implemented");
      }
   }

   public String getName() {
      return NAME;
   }

   public List<Obj> getConfigs() {
      return Collections.emptyList();
   }

   public void init() {
      if (xmlOutputFactory.isPropertySupported("escapeCharacters"))
         // in the old Woodstox version, this was supported
         xmlOutputFactory.setProperty("escapeCharacters", false);
      else if (xmlOutputFactory.isPropertySupported(XMLOutputFactory2.P_TEXT_ESCAPER))
         // in the new, we just manually make this a no-op
         xmlOutputFactory.setProperty(XMLOutputFactory2.P_TEXT_ESCAPER, new NoopEscapingWriterFactory());
   }

   public void stop() {
      httpClients.clear();
      poolBoundHttpClients.clear();
   }

   // TODO(PLAT-27284): implement
   public Object execute(Action action) {
      String actionName = action.methodType().name();
      RestAction restAction = new RestAction(action, this);
      if ("isUrlConfigured".equals(actionName)) {
         return restAction.endpoint(false) != null;
      } else if ("apiUrl".equals(actionName)) {
         return restAction.endpoint(false);
      } else if ("apiAuth".equals(actionName)) {
         return restAction.auth();
      } else if ("setApiUrlAndAuth".equals(actionName)) {
         String url = action.argValue("url");
         String auth = action.argValue("auth");
         String configOverride = action.argValue("configOverride");
         RestConfig config = restAction.inst().config();
         if (Str.isNotEmpty(url))
            config.setConfigValue("url", url, configOverride);
         if (Str.isNotEmpty(auth))
            config.setSecretValue("auth", auth, configOverride);
      } else if ("config".equals(actionName)) {
         REST ths = action.argValue("this");
         Boolean secrets = action.argValue("secrets");
         return C3.callSuper(ths, secrets);
      } else if ("configKey".equals(actionName)) {
         REST ths = action.argValue("this");
         return C3.callSuper(ths);
      } else if ("inst".equals(actionName) && C3.type().isA(DefaultInstance.TYPE_NAME)) {
         Obj inst = C3.type().instantiate();
         if (inst.type().meta().isIdentifiable())
            inst = inst.withField(O.id, inst.type().name(), true);
         if (inst.type().meta().isNameable())
            inst = inst.withField(O.name, inst.type().name(), true);
         return inst;
      } else if ("sendTextRequest".equals(actionName)) {
         //             String url = restAction.endpoint(true);
         //             String method = (String) action.args().get("method");
         //             String request = (String) action.args().get("request");
         //             Map<String, String> headers = (Map<String, String>) action.args().get("headers");
         // TODO: log request and headers
         // TODO: actually make a call
         String res = null;
         if (Str.isNotEmpty(res))
            action.setResult(res);
      } else if ("sendJsonRequest".equals(actionName)) {
         // Commented out until the TODO below is completed
         //             String url = restAction.endpoint(true);
         //             String method = action.getInputValue("method");
         //             JsonNode request = action.getInputValue("request");
         //             Map<String, String> headers = action.getInputValue("headers");
         // TODO: log request and headers
         // TODO: actually make a call
         String res = null;
         if (Str.isNotEmpty(res))
            action.setResult(Jsn.parse(res));
      } else {
         restAction.generateRESTRequest();
         restAction.sendRESTRequest();
         return restAction.processRESTResponse();
      }
      return null;
   }

   public String execute(Type type, String actionName, String url, String requestBody) {
      RestAction restAction = new RestAction(type, actionName, this);
      restAction.generateRESTRequest(url, requestBody);
      restAction.sendRESTRequest();
      return restAction.responseContent();
   }

   private String clientKey(String endPointUrl, int timeout, boolean compress) {
      return endpoint(endPointUrl) + "-" + String.valueOf(timeout) + "-" + String.valueOf(compress);
   }

   private String endpoint(String endPointUrl) {
      try {
         URL url = new URL(endPointUrl);
         String endPoint = url.getProtocol() + "://" + url.getHost();
         if (url.getPort() > 0)
            endPoint += ":" + url.getPort();
         return endPoint;
      } catch (MalformedURLException e) {
         throw new RuntimeException(e);
      }
   }

   /**
    * Get the HttpClient for the given route
    *
    * @param endPointUrl
    * @param maxConnections
    * @return
    * @throws MalformedURLException
    */
   public CloseableHttpClient getClient(String endPointUrl, int timeout, int maxConnections,
                                        boolean compress) throws MalformedURLException {
      String endPoint = endpoint(endPointUrl);
      String key = clientKey(endPointUrl, timeout, compress);

      Pair<Integer, CloseableHttpClient> pair = httpClients.get(key);
      if (pair != null && maxConnections == pair.fst()) {
         // got it
         return pair.snd();
      }

      CloseableHttpClient httpClient = null;
      synchronized (httpClients) {
         pair = httpClients.get(key);
         if (pair != null) {
            if (maxConnections != pair.fst()) {
               // need to change the max connections for the client
               httpClient =
                     HttpClientBuilder.create().setSocketTimeout(timeout * 1000)
                                      .setMaxPerRoute(endPoint, maxConnections).setCompress(compress).build(endPoint);
               Pair<Integer, CloseableHttpClient> newPair = Pair.of(maxConnections, httpClient);
               httpClients.replace(key, newPair);
            } else
               httpClient = pair.snd();
         } else {
            httpClient =
                  HttpClientBuilder.create().setSocketTimeout(timeout * 1000).setMaxPerRoute(endPoint, maxConnections)
                                   .setCompress(compress).build(endPoint);
            Pair<Integer, CloseableHttpClient> newPair = Pair.of(maxConnections, httpClient);
            httpClients.put(key, newPair);
         }
      }

      return httpClient;
   }

   /**
    * Get the HttpClient for the given route
    *
    * @param endPointUrl
    * @param maxConnections
    * @return
    * @throws MalformedURLException
    */
   public CloseableHttpClient getPoolBoundClient(String endPointUrl, int timeout, int maxConnections,
                                                 boolean compress) throws MalformedURLException {
      CloseableHttpClient httpClient = null;
      String endPoint = endpoint(endPointUrl);
      String key = clientKey(endPointUrl, timeout, compress);
      if (threadHttpClients.get() == null) {
         threadHttpClients.set(new HashMap<String, CloseableHttpClient>());
      } else {
         httpClient = threadHttpClients.get().get(key);
         if (httpClient != null)
            return httpClient;
      }

      Pair<Integer, CloseableHttpClient> pair = poolBoundHttpClients.get(key);
      if (pair != null) {
         synchronized (pair) {
            if (pair.fst() < maxConnections) {
               Pair<Integer, CloseableHttpClient> newPair = Pair.of(pair.fst() + 1, pair.snd());
               poolBoundHttpClients.put(key, newPair);
               threadHttpClients.get().put(key, pair.snd());
               return pair.snd();
            }
         }
      }

      synchronized (poolBoundHttpClients) {
         pair = poolBoundHttpClients.get(key);
         if (pair != null) {
            synchronized (pair) {
               if (pair.fst() < maxConnections) {
                  Pair<Integer, CloseableHttpClient> newPair = Pair.of(pair.fst() + 1, pair.snd());
                  poolBoundHttpClients.put(key, newPair);
                  threadHttpClients.get().put(key, pair.snd());
                  return pair.snd();
               }
            }
         }

         int timeoutInMs = timeout * 1000;
         httpClient = HttpClientBuilder.create().setSocketTimeout(timeoutInMs).setCompress(compress)
                                       .build(endPoint, maxConnections);
         Pair<Integer, CloseableHttpClient> newPair = Pair.of(1, httpClient);
         poolBoundHttpClients.put(endPoint, newPair);
         threadHttpClients.get().put(endPoint, httpClient);
      }

      return httpClient;
   }

   public class RestAction {

      private Map<String, String> reqHeaders = new LinkedHashMap<>();
      private Map<String, String> reqQueryParams = new LinkedHashMap<>();
      private Map<String, Pair<ValueType, Object>> reqPostParams = new LinkedHashMap<>();
      private Map<String, String> reqOriginalParamName = new LinkedHashMap<>();
      private String reqMethod;
      private String reqContentType;
      private String reqAcceptType;
      private String reqAcceptHeader;
      private Action action;
      private RESTEngine engine;
      private String endpoint;
      private String requestUri;
      private String requestUrl;
      private Array<FunctionParam> actionArguments = AnyType.myArrayType().defaultEmptyValue();
      // cannot be null
      private String requestBody = "";
      private HttpUriRequest httpRequest;
      private String responseContent = null;
      private byte[] contentBytes = null;
      private String resContentType;
      private CloseableHttpResponse response = null;
      private ArrayMapBuilder<String, String> responseHeaders = ArrayMapBuilder.ofStrToStr();
      private Type type;
      private Ann.Rest configuredAnnotations;
      private RestConfig config;
      @SuppressWarnings("serial")
      public final Set<String> supportedContentType = new HashSet<String>() {

         {
            add(MediaType.JSON);
            add(MediaType.JSON_MERGE_PATCH);
            add(MediaType.JSON_PATCH);
            add(MediaType.JSON_LINES);
            add(MediaType.XML);
            add(MediaType.XML_APP);
            add(MediaType.FORM_URLENCODED);
            add(MediaType.PLAIN_TEXT);
         }
      };

      public RestAction(Action a, RESTEngine e) {
         action = a;
         engine = e;
         type = action.targetType();
         configuredAnnotations = action.methodType().annotations().rest();
         config = a.methodType().isMember() ? (RestConfig) ((Configurable) a.argValue("this")).config(true)
                                            : REST.downcast(type).typeConfig();
      }

      public RestAction(Type type, String actionName, RESTEngine e) {
         action = C3.newChildAction(type.meta().method(actionName));
         engine = e;
         this.type = type;
         configuredAnnotations = Ann.Rest.make();
         config = REST.downcast(type).typeConfig();
      }

      public void generateRESTRequest(String endpoint, String requestBody) {
         this.endpoint = endpoint;
         requestUri = "";

         StringBuilder url = new StringBuilder(endpoint);
         addToUrl(url, requestUri);
         requestUrl = url.toString();

         reqMethod = HttpMethod.POST;

         reqContentType = MediaType.JSON;

         if (!supportedContentType.contains(reqContentType))
            throw Err.formatted("Unable to generate REST request because {}",
                                "Unsupported content type " + reqContentType);

         reqAcceptType = MediaType.JSON;

         reqAcceptHeader = reqAcceptType;

         if (!supportedContentType.contains(reqAcceptType))
            throw Err.formatted("Unable to generate REST request because {}",
                                "Unsupported accept type " + reqAcceptType);

         addRestHeaders();

         addRequestParams();

         httpRequest = createHttpRequest();

         logRequest(httpRequest, requestBody);
      }

      public void generateRESTRequest() {
         endpoint = endpoint(true);

         if (action.methodType().params().size() > 0 || action.isMember()) {
            actionArguments = action.methodType().params();
            if (action.isMember()) {
               if (!action.methodType().annotations().rest().skipThis()) {
                  actionArguments = actionArguments.with(FunctionParam.builder(type.pkg())
                                                                      .name(FunctionParam.THIS)
                                                                      .valueType(action.targetType().referenceType())
                                                                      .build());
               }
            }
         }

         requestUri = generateUri();

         StringBuilder url = new StringBuilder(endpoint);
         addToUrl(url, requestUri);
         requestUrl = url.toString();
         reqMethod = Val.dflt(action.methodType().annotations().rest().method(), () -> HttpMethod.GET);
         reqContentType = Val.dflt(action.methodType().annotations().rest().contentType(), () -> bodyType());

         if (!supportedContentType.contains(reqContentType))
            throw Err.formatted("Unable to generate REST request because {}",
                                "Unsupported content type " + reqContentType);
         reqAcceptType = Val.dflt(action.methodType().annotations().rest().acceptType(), () -> MediaType.JSON);
         reqAcceptHeader = Val.dflt(action.methodType().annotations().rest().acceptHeader(), () -> reqAcceptType);

         if (!supportedContentType.contains(reqAcceptType))
            throw Err.formatted("Unable to generate REST request because {}",
                                "Unsupported accept type " + reqAcceptType);

         addRestHeaders();

         addRequestParams();

         httpRequest = createHttpRequest();

         logRequest(httpRequest, requestBody);
      }

      private byte[] requestBodyAsByteArray() {
         Pair<ValueType, Object> value = reqPostParams.entrySet().iterator().next().getValue();
         if (value.fst().isBinary())
            return ((ByteBuffer) value.snd()).array();
         return new byte[0];
      }

      public String requestBodyAsString() {
         switch (reqContentType) {
            case MediaType.JSON:
            case MediaType.JSON_MERGE_PATCH:
            case MediaType.JSON_PATCH:
               String originalName = reqOriginalParamName.get(reqPostParams.entrySet().iterator().next().getKey());
               Annotation rest = action.methodType().param(originalName).annotation("rest");
               boolean doNotUseParameterNameCondCheck =
                     reqPostParams.size() == 1 && rest != null && rest.fieldValue("doNotUseParameterName") != null;
               boolean useParameterName =
                     doNotUseParameterNameCondCheck ? !(boolean) rest.fieldValue("doNotUseParameterName") : true;
               requestBody = Jsn.fromFields(reqPostParams, !useParameterName, false).toString();
               break;
            case MediaType.JSON_LINES:
               requestBody = "";
               reqPostParams.forEach((f, s) -> requestBody += s.snd().toString() + "\n");
               break;
            // TODO(PLAT-27284): implement
            //            case MediaType.XML:
            //            case MediaType.XML_APP:
            //               try {
            //                  StringWriter writer = new StringWriter();
            //                  XMLStreamWriter xmlWriter = engine.xmlOutputFactory.createXMLStreamWriter(writer);
            //                  XmlOut xmlOut = new XmlOut(xmlWriter, true, false);
            //                  xmlOut.setWriteVersion(false);
            //                  String rootElement = fieldType(action).annotations().rest().xmlRoot(); // extension(fieldType(action), "xmlRoot");
            //                  if (rootElement == null)
            //                     throw Err.formatted("Unable to generate REST request body. {}",
            //                                         "xmlRoot should be specified in the function annotation");
            //                  Arrays.asList(rootElement.split("/")).stream().forEach(e -> xmlOut.startElement(e));
            //
            //                  reqPostParams.forEach((k, v) -> {
            //                     ValueType vt = v.fst();
            //                     Object obj = v.snd();
            //                     String elementName = k;
            //                     if (vt.isPrimitive())
            //                        xmlOut.element(elementName, obj.toString());
            //                     else if (vt.isReference() && ((Obj) obj).type().isA(Xml.myType())) {
            //                        String refXml = Xml.downcast(((Obj) obj).type()).toXml(obj);
            //                        xmlOut.characters(refXml);
            //                     } else if (vt.isReference() || vt.isArray()) {
            //                        String refXml = XmlSerDeser.prettyPrintXml((Obj) obj, elementName);
            //                        xmlOut.characters(refXml);
            //                     } else {
            //                        throw Err.formatted("Unable to generate REST request body. {}",
            //                                            " No support for " + vt.type()
            //                                                                   .name() + ". Only primitives, reference and array types are supported ");
            //                     }
            //                  });
            //                  if (rootElement != null) {
            //                     String[] rootElements = rootElement.split("/");
            //                     for (int i = rootElements.length - 1; i >= 0; i--)
            //                        xmlOut.endElement();
            //                  }
            //                  xmlOut.flush();
            //                  requestBody = writer.toString();
            //                  xmlOut.close();
            //               } catch (Exception e) {
            //                  throw Err.wrap(e);
            //               }
            //               break;
            case MediaType.FORM_URLENCODED:
               String joiner = "";
               StringBuilder sb = new StringBuilder();
               for (Map.Entry<String, Pair<ValueType, Object>> e : reqPostParams.entrySet()) {
                  Pair<ValueType, Object> value = e.getValue();
                  if (value.fst().isString()) {
                     String str = value.snd().toString();
                     try {
                        sb.append(joiner).append(e.getKey()).append("=").append(URLEncoder.encode(str, "UTF-8"));
                     } catch (UnsupportedEncodingException e1) {
                        log.warn("Unable to encode URL, exception: %s", e1);
                     }
                     joiner = "&";
                  }
               }
               requestBody = sb.toString();
               break;
         }
         return requestBody;
      }

      private String bodyType() {
         String bodyType = action.methodType().annotations().rest().bodyType();
         if (bodyType == null)
            bodyType = "json";
         switch (bodyType) {
            case "json":
               return MediaType.JSON;
            case "xml":
               return MediaType.XML;
            case "plain":
               // for backward compatibility
               return MediaType.FORM_URLENCODED;
            case "ndjson":
               return MediaType.JSON_LINES;
            default:
               return MediaType.JSON;
         }
      }

      private void addRequestParams() {
         actionArguments.stream()
                        .filter(a -> !checkRestAnnotation(a)
                                     || (!a.annotations().rest().partOfURI() && !a.annotations().rest().header()))
                        //                                       !functionAnnotation(a.annotations(), "partOfURI")
                        //                                     && !functionAnnotation(a.annotations(), "header"))
                        .filter(a -> action.argValue(a.name()) != null || a.isVarArgs()).each(a -> {
                           String overrideName = a.name(); //functionAnnotation(a.annotations(), "parameterName", a.name());
                           if (checkRestAnnotation(a) && a.annotations().rest().parameterName() != null) {
                              overrideName = a.annotations().rest().parameterName();
                           }
                           reqOriginalParamName.put(overrideName, a.name());
                           if (reqMethod.equals(HttpMethod.GET) || reqMethod.equals(HttpMethod.HEAD)
                               || (checkRestAnnotation(a) && a.annotations().rest()
                                                              .queryParameter())) { //functionAnnotation(a.annotations(), "queryParameter"))
                              if (a.isVarArgs() && action.argValue(a.name()) instanceof Object[] arr) {
                                 for (int i = 0; i < arr.length; i++)
                                    reqQueryParams.put("vararg" + i, arr[i].toString());
                              } else {
                                 reqQueryParams.put(overrideName, action.argValue(a.name()).toString());
                              }
                           } else {
                              if (a.isVarArgs() && action.argValue(a.name()) instanceof Object[] arr) {
                                 for (int i = 0; i < arr.length; i++)
                                    reqPostParams.put("vararg" + i, Pair.of(((ArrayType) a.valueType()).elementType(),
                                                                            arr[i].toString()));
                              } else {
                                 reqPostParams.put(overrideName, Pair.of(a.valueType(), action.argValue(a.name())));
                              }
                           }
                        });
      }

      public String generateUri() {
         StringBuilder url = new StringBuilder();
         String uri = action.methodType().annotations().rest().uri();
         if (Str.isNotEmpty(uri))
            url.append(uri);
         actionArguments.stream()
                        .filter(a -> checkRestAnnotation(a) && a.annotations().rest().partOfURI())
                        .filter(a -> {
                           Object value = action.argValue(a.name());
                           String input = value != null ? value.toString() : null;
                           return action.methodType().paramIsNonEmpty(a.name()) || Str.isNotEmpty(input);
                        }).each(a -> {
                           String prefix = a.annotations().rest().uriPrefix();
                           Object value = action.argValue(a.name());
                           String input = value != null ? value.toString() : null;
                           if (Str.isNotEmpty(prefix))
                              addToUrl(url, prefix);
                           if (Str.isNotEmpty(input)) {
                              addToUrl(url, input);
                              String suffix = a.annotations().rest().uriSuffix();
                              if (Str.isNotEmpty(suffix))
                                 addToUrl(url, suffix);
                           }
                        });
         return url.toString();
      }

      private void addToUrl(StringBuilder url, String append) {
         if (url.toString().endsWith("/") && append.startsWith("/"))
            url.append(append.substring(1));
         else
            url.append(append);
      }

      private void addRestHeaders() {
         // TODO(PLAT-27284): implement
         String auth = auth();
         if (Str.isNotEmpty(auth))
            reqHeaders.put("Authorization", auth);

         // Add X-C3-Context to Header. This enables the REST endpoint to identify caller's C3-Context.
         boolean c3Context = Val.dflt(configuredAnnotations.c3Context(), () -> false);
         if (c3Context) {
            // TODO(PLAT-27284): implement
            //            String locale = action.language() != null ? "\", \"locale\": \"" + action.language().language() : "";
            String locale = "";
            Context context = Context.inst();
            String X_C3_Context = "{ " + " \"user\": \"" + action.userName() + "\"," + " \"tenant\": \""
                                  + context.env().name() + "\"," + " \"tag\": \"" + context.app().name() + "\","
                                  + " \"url\": \""
                                  + hostUrl() + locale + "\"" + " }";
            reqHeaders.put("X-C3-Context", X_C3_Context);
         }
         if (!acceptsBinary())
            reqHeaders.put("Accept-Encoding", "gzip");
         reqHeaders.put("Accept", reqAcceptHeader);
         reqHeaders.put("Content-Type", reqContentType);
         reqHeaders.put("Cache-Control", "no-cache");

         // add header from the function arguments
         actionArguments.stream().filter(a -> checkRestAnnotation(a) && a.annotations().rest().header()) // functionAnnotation(a.annotations(), "header"))
                        .filter(a -> action.argValue(a.name()) != null)
                        .each(a -> reqHeaders.put(a.annotations().rest().headerName() != null
                                                                                              ? a.annotations().rest()
                                                                                                 .headerName()
                                                                                              : a.name(), //functionAnnotation(a.annotations(), "headerName", a.name()),
                                                  action.argValue(a.name()).toString()));

         reqHeaders.get("Content-Encoding");
      }

      private String hostUrl() {
         return Context.inst().appUrl().endpoint();
      }

      private URI addQueryParams(URIBuilder uriBuilder) {
         try {
            if (reqQueryParams != null) {
               for (Map.Entry<String, String> entry : reqQueryParams.entrySet())
                  uriBuilder.addParameter(entry.getKey(), entry.getValue());
            }
            URI uri = uriBuilder.build();
            if (uri.getHost() != null && uri.getHost().endsWith("googleapis.com")
                && reqQueryParams.containsKey("client")) {
               uri = URI.create(GoogleApiUrlSigner.sign(uri.toString()));
            }
            return uri;
         } catch (URISyntaxException | InvalidKeyException | NoSuchAlgorithmException | IOException e) {
            throw Err.wrap(e);
         }
      }

      private HttpEntity reqEntity() {
         if (!reqPostParams.isEmpty()) {
            if (isBinaryContent())
               return new ByteArrayEntity(requestBodyAsByteArray());
            else
               return new StringEntity(requestBodyAsString(), Consts.UTF_8);
         }
         return null;
      }

      private boolean isBinaryContent() {
         return reqPostParams.size() == 1 && reqPostParams.entrySet().iterator().next().getValue().fst().isBinary();
      }

      private boolean acceptsBinary() {
         return If.notEmpty(action.returnType(), (t) -> t.isA(HttpBinaryResponse.myReferenceType()), () -> false);
      }

      private boolean compress() {
         return !isBinaryContent() && !acceptsBinary();
      }

      private HttpUriRequest createHttpRequest() {
         HttpUriRequest req;
         try {
            URIBuilder uriBuilder = new URIBuilder(requestUrl);
            URI uri = addQueryParams(uriBuilder);
            switch (reqMethod) {
               case "GET":
                  req = new HttpGet(uri);
                  break;
               case "HEAD":
                  req = new HttpHead(uri);
                  break;
               case "POST":
                  HttpPost post = new HttpPost(uri);
                  post.setEntity(reqEntity());
                  req = post;
                  break;
               case "PUT":
                  HttpPut put = new HttpPut(uri);
                  put.setEntity(reqEntity());
                  req = put;
                  break;
               case "PATCH":
                  HttpPatch patch = new HttpPatch(uri);
                  patch.setEntity(reqEntity());
                  req = patch;
                  break;
               case "DELETE":
                  HttpDeleteWithBody delete = new HttpDeleteWithBody(uri);
                  delete.setEntity(reqEntity());
                  req = delete;
                  break;
               default:
                  throw methodNotSupported(reqMethod);
            }
         } catch (URISyntaxException e) {
            throw Err.wrap(e);
         }

         reqHeaders.forEach((k, v) -> req.addHeader(k, v));

         return req;
      }

      public void sendRESTRequest() {
         InputStream content = null;
         boolean poolBound = Val.dflt(config.createPool(), () -> false);
         int retries = Val.dflt(config.retries(), () -> 1L).intValue();
         int timeout =
               Val.dflt(config.timeout(), () -> (long) HttpClientBuilder.getDefaultTimeout()).intValue();
         int maxConnections = Val.dflt(config.maxConn(), () -> (long) MAX_PER_ROUTE_DEFAULT).intValue();
         int baseSleepSec = Val.dflt(config.retryBaseSleep(), () -> 10L).intValue();
         boolean failOnRedirectResponse = Val.dflt(config.failOnRedirectResponse(), () -> false);
         Array<Long> httpCodes = config.retryHttpCodes();
         Array<String> apiErrors = config.retryApiErrors();
         long elapsed = 0;
         CloseableHttpClient client;
         HttpEntity entity = null;
         try {
            if (poolBound)
               client = engine.getPoolBoundClient(requestUrl, timeout, maxConnections, compress());
            else
               client = engine.getClient(requestUrl, timeout, maxConnections, compress());

            boolean retry = true;
            int retryCount = 0;
            while (retry) {
               retry = false;
               long start = System.currentTimeMillis();
               if (retries > 1)
                  response = client.executeWithRetry(httpRequest, retries);
               else
                  response = client.execute(httpRequest);
               elapsed = System.currentTimeMillis() - start;

               int code = response.getStatusLine().getStatusCode();
               entity = response.getEntity();
               if (entity != null)
                  content = entity.getContent();
               if (content != null)
                  if (acceptsBinary()) {
                     contentBytes = IOUtils.toByteArray(content);
                     responseContent = new String(contentBytes, Charset.defaultCharset());
                  } else
                     responseContent = IOUtils.toString(content);

               if (!(code >= 200 && code < 300) || code == 503) {
                  String apiError = null;
                  if (responseContent != null)
                     apiError = apiErrors != null ? responseContains(
                                                                     responseContent == null ? response.getStatusLine()
                                                                                                       .toString()
                                                                                             : responseContent,
                                                                     apiErrors)
                                                  : null;
                  if (httpCodes != null && httpCodes.contains(code) || canRetryForServiceUnavailability(code)
                      || apiError != null) {
                     Header retryAfter = response.getFirstHeader("Retry-After");
                     if (retryAfter != null && Str.isNum(retryAfter.getValue()))
                        baseSleepSec = Integer.parseInt(retryAfter.getValue());
                     if (++retryCount <= retries) {
                        try {
                           retry = true;
                           log.warn("retrying on httpCode %s%s (retry:%s, maxRetries:%s, baseRetrySleep:%s)", code,
                                    apiError != null ? " apiError '" + apiError + "'" : "", retryCount, retries,
                                    baseSleepSec);
                           Thread.sleep(baseSleepSec * retryCount * 1000);
                        } catch (InterruptedException e) {
                           throw Err.wrap(e);
                        } finally {
                           try {
                              if (response != null)
                                 response.close();
                           } catch (Exception ex) {
                              log.warn("error closing the entity InputStream on retriable request: " + ex);
                              throw ex;
                           }
                        }
                        responseContent = null;
                        continue;
                     }
                     throw processError(reqMethod, requestUrl, response, code);
                  } else if (code >= 400 && code < 600) {
                     throw processError(reqMethod, requestUrl, response, code);
                  } else if (code >= 300 && code < 400 && failOnRedirectResponse) {
                     throw processError(reqMethod, requestUrl, response, code);
                  } else
                     // unexpected response code
                     log.warn("got unexpected request code %s for %s", code, requestUrl);
               }
            }

            log.info("Request_method=%s Response_code=%d The request to %s took %sms", reqMethod,
                     response.getStatusLine().getStatusCode(), requestUrl, elapsed);

            if (Str.isNotEmpty(responseContent)) {
               ContentType contentType;
               contentType = ContentType.get(entity);
               resContentType = contentType.getMimeType();
               if (!resContentType.equals(reqAcceptType))
                  log.warn("Response content type is %s while the accept type in the request is %s", resContentType,
                           reqAcceptType);
            }

            // get the response size, include the headers size if debug enabled
            // prints the headers in the log as well
            getResponseSize(response);

            if (log.isTraceEnabled() && Str.isNotEmpty(responseContent)) {
               if (responseContent.contains("password") || responseContent.contains("Password")
                   || responseContent.contains("PASSWORD"))
                  log.trace("response contains sensitive information, content will not be logged");
               else
                  log.trace("Response payload:\n%s", responseContent);
            }
         } catch (IllegalStateException | IOException e) {
            String key = clientKey(requestUrl, timeout, compress());
            if (httpClients.get(key) != null)
               httpClients.remove(key);
            throw Err.wrap(e);
         } finally {
            if (content != null) {
               try {
                  content.close();
               } catch (IOException e) {
                  log.warn("error closing the entity InputStream");
               }
            }
            if (response != null) {
               try {
                  response.close();
               } catch (IOException e) {
                  log.warn("failed to close http response:", e);
               }
            }
         }
      }

      public Object processRESTResponse() {
         if (action.returnType() != null) {
            Object result = null;
            try {
               if (!action.returnType().isAny()
                   && action.returnType().isA(c3.platform.http.HttpResponse.myReferenceType()))
                  result = createC3HttpResponse();
               else if (Str.isNotEmpty(responseContent))
                  result = deserContent();
               else
                  result = withResponseMetadata(result);
            } finally {
               return result;
            }
         }
         return null;
      }

      public String responseContent() {
         return responseContent;
      }

      private Object createC3HttpResponse() {
         c3.platform.http.HttpRequest request = HttpRequest.builder().method(reqMethod).url(requestUrl).build()
                                                           .withHeaders(Java.toMap(reqHeaders, MapType.ofStrToStr()))
                                                           .withBodyString(requestBody);
         c3.platform.http.HttpResponse.Builder header =
               c3.platform.http.HttpResponse.builder()
                                            .request(request)
                                            .statusCode(response.getStatusLine().getStatusCode())
                                            .reasonPhrase(response.getStatusLine().getReasonPhrase())
                                            .httpVersion(If.notNull(response.getProtocolVersion(),
                                                                    ProtocolVersion::toString, null));

         c3.platform.http.HttpResponse res =
               (responseContent != null ? header._body(ByteBuffer.wrap(responseContent.getBytes(StandardCharsets.UTF_8)))
                                                .build()
                                        : header.build()).withHeaders(readResponseHeaders())
                                                         // remove content encoding since responseContent is already decoded
                                                         .withoutHeader("Content-Encoding");
         return !acceptsBinary() ? res : HttpBinaryResponse.builder(res).content(ByteBuffer.wrap(contentBytes)).build();
      }

      private boolean canRetryForServiceUnavailability(int code) {
         return HttpMethod.isIdempotent(reqMethod) && (503 == code || 429 == code); // C3ErrorCodes.Code.HttpServiceUnavailable.httpCode;
      }

      private Object withResponseMetadata(Object result) {
         ValueType resultType = action.returnType();
         if (MediaType.JSON.equals(reqAcceptType) && resultType.isReference()
             && resultType.asReferenceType().dereference().isA(HttpResponseMetadata.myType()))
            result = HttpResponseMetadata.downcast(resultType.asReferenceType().dereference()).builder((Obj) result)
                                         .reasonPhrase(response.getStatusLine().getReasonPhrase())
                                         .statusCode(response.getStatusLine().getStatusCode()).build()
                                         .withHeaders(readResponseHeaders());
         return result;
      }

      private Object deserContent() {
         Object result = null;
         XMLStreamReader reader = null;
         try {
            ValueType resultType = action.returnType();
            switch (reqAcceptType) {
               case MediaType.JSON:
                  result = JsonSerDeser.read(resultType, true, IOUtils.toInputStream(responseContent));
                  if (resultType instanceof JsonType)
                     result = JsonNode.wrap((com.fasterxml.jackson.databind.JsonNode) result);
                  if (result instanceof Boxed && !resultType.isBoxed())
                     result = resultType.convertValue(((Boxed) result).value());
                  result = withResponseMetadata(result);
                  break;
               // TODO(PLAT-27284): implement
               //               case MediaType.XML:
               //               case MediaType.XML_APP:
               //                  if (resultType.isReference() && resultType.asReferenceType().dereference().isA(Xml.myType()))
               //                     result = C3.dispatch(resultType.asReferenceType().dereference(), "fromXml", responseContent);
               //                  else {
               //                     reader = XMLInputFactory.newInstance().createXMLStreamReader(new StringReader(responseContent));
               //                     if (resultType.isArray()) {
               //                        try {
               //                           result = XmlSerDeser.read(resultType, action.metadata(), reader, null, true, false, false);
               //                        } catch (Exception e) {
               //                           if (e.getMessage().contains("Unexpected event END_ELEMENT"))
               //                              // empty xml. XML SerDeser does not handle this case
               //                              result = null;
               //                           else
               //                              throw e;
               //                        }
               //                     } else
               //                        result = XmlSerDeser.read(resultType, action.metadata(), reader, null, true, false, false);
               //                  }
               //                  break;
               case MediaType.PLAIN_TEXT:
                  result = responseContent;
            }
         } catch (Exception e) {
            throw Err.wrap(e);
         } finally {
            if (reader != null)
               try {
                  reader.close();
               } catch (XMLStreamException e) {
                  log.warn("failed to close XMLStreamReader", e);
               }
         }
         return result;
      }

      private C3RuntimeException methodNotSupported(String method) {
         return Err.formatted("Method {} not supported", method);
      }

      private String responseContains(String errorJson, Array<String> apiErrors) throws IllegalStateException,
                                                                                 IOException {
         String ret = null;
         for (String apiError : apiErrors) {
            if (errorJson.contains(apiError)) {
               ret = apiError;
               break;
            }
         }
         return ret;
      }

      /*
       * Get an approximation of the request size and if log level is TRACE dump the request to the log file
       * If log level is DEBUG, the header sizes will be added
       */
      private long logRequest(HttpUriRequest req, String body) {
         long reqSize = 0;
         String uri = req.getURI().toString();
         reqSize = uri.length();
         if (body != null)
            reqSize += body.length();

         if (log.isDebugEnabled()) {
            // get and approximation of the headers size
            Header[] headers = req.getAllHeaders();
            for (int idx = 0; idx < headers.length; idx++) {
               reqSize += headers[idx].getName().length();
               if (Str.isNotEmpty(headers[idx].getValue()))
                  reqSize += headers[idx].getValue().length();
            }
         }
         if (log.isTraceEnabled()) {
            // trace full request
            StringBuilder sb = new StringBuilder();
            sb.append(req.getMethod());
            sb.append(" ");
            sb.append(uri);
            if (Str.isNotEmpty(body)) {
               sb.append("\nRequest body:\n\t");
               if (body.contains("password") || body.contains("Password") || body.contains("PASSWORD"))
                  sb.append("body contains sensitive information, it will not be logged");
               else
                  sb.append(body);
            }
            sb.append("\nRequest headers:");
            Header[] headers = req.getAllHeaders();
            for (int idx = 0; idx < headers.length; idx++) {
               sb.append("\n\t");
               sb.append(headers[idx].getName());
               sb.append(": ");
               if ("Authorization".equals(headers[idx].getName()))
                  sb.append("XXXXXXXXXXXX");
               else
                  sb.append(headers[idx].getValue());
            }

            log.trace("%s", sb.toString());
         }

         return reqSize;
      }

      /*
       * Get an approximation of the response size, if log level is DEBUG, the header sizes will be added
       * and logged
       */
      private long getResponseSize(CloseableHttpResponse response) throws IllegalStateException, IOException {
         long respSize = responseContent == null ? 0 : responseContent.length();
         if (log.isDebugEnabled()) {
            StringBuilder sb = new StringBuilder("Response headers:");
            // get and approximation of the headers size
            c3.platform.typesys.value.Map<String, Array<String>> headers = readResponseHeaders();
            respSize = headers.map((v, k) -> {
               sb.append("\n\t").append(k).append(": ").append(v.toString());
               return ((Number) v.map(String::length).sum()).longValue() + k.length();
            }).elements().collect().stream().sum();
            log.debug("%s", sb.toString());
         }

         // if (log.isTraceEnabled() && responseContent != null)
         // log.trace("Rest Response:\n {}", responseContent.toString());
         return respSize;
      }

      private c3.platform.typesys.value.Map<String, Array<String>> readResponseHeaders() {
         if (responseHeaders.isEmpty() && response != null) {
            Header[] headers = response.getAllHeaders();
            Array.ofAny(headers)
                 .each(h -> responseHeaders.add(h.getName(), h.getValue()));
         }
         return responseHeaders.build();
      }

      private C3RuntimeException processError(String method, String url, HttpResponse response, int code) {
         String errorJson = null;
         try {
            errorJson = responseContent == null ? response.getStatusLine().toString() : responseContent;
            if (log.isTraceEnabled()) {
               StringBuilder sb = new StringBuilder("Response headers:");
               // get and approximation of the headers size
               Header[] headers = response.getAllHeaders();
               for (int idx = 0; headers != null && idx < headers.length; idx++) {
                  sb.append("\n\t");
                  sb.append(headers[idx].getName());
                  sb.append(": ");
                  sb.append(headers[idx].getValue());
               }
               log.trace("%s", sb.toString());
               log.trace("Response payload:\n%s", errorJson);
            }
         } catch (IllegalStateException e) {
            log.error("Exception getting API error info:", e);
         }

         if (Str.isEmpty(errorJson))
            errorJson = String.valueOf(code) + " Http Status Code";

         if (code == 401)
            return Err.unauthenticated();
         //            return Err.javaExceptionFormatted("{} {} failed with error: {}", method, url, errorJson,
         //                                              C3ErrorCodes.Code.Unauthenticated);
         else if (code == 404)
            return Err.missing(errorJson);
         //            return Err.javaExceptionFormatted("{} {} failed with error: {}", method, url, errorJson,
         //                                              C3ErrorCodes.Code.ResourceNotFound);
         else
            return Err.javaExceptionFormatted("{} {} failed with error: {}", method, url, errorJson);
      }

      public REST inst() {
         REST ths = action.argValue("this");
         if (ths == null && action.targetType().isA(DefaultInstance.TYPE_NAME))
            ths = (REST) DefaultInstance.downcast(action.targetType()).inst();
         if (ths == null)
            ths = action.targetType().instantiate();
         return ths;
      }

      public String auth() {
         REST ths = inst();
         String auth = (ths != null ? ths.auth() : null);
         if (Str.isEmpty(auth))
            auth = Ctx.asRoot(() -> ths.config().secretValue("auth"));
         if (Str.isEmpty(auth))
            auth = config.auth();
         if (auth != null && auth.equals("c3Auth")) {
            auth = Ctx.userSession();
            if (Str.isEmpty(auth)) {
               throw Err.formatted("No c3Auth token found for current session");
            }
         }

         // TODO(PLAT-27284): implement
         //         if (auth != null && auth.startsWith("c3Key:")) {
         //            StringBuilder pk = new StringBuilder("");
         //            String[] parts = auth.split(":");
         //            pk.append(C3.asWorker(() -> TenantConfig.configStr(new String(Base64.getDecoder().decode(parts[1]))
         //                                                               + ".auth")));
         //
         //            if (Str.isEmpty(pk.toString())) {
         //               String configStr = new String(Base64.getDecoder().decode(parts[1])) + ".auth";
         //               pk.append(C3.asWorker(() -> C3.withC3Tenant(() -> TenantConfig.configStr(configStr))));
         //            }
         //
         //            if (Str.isEmpty(pk.toString())) {
         //               throw Err.missing(pk.toString(), "private key"); // throw Err.wrap("No private key found.");
         //            }
         //
         //            try {
         //               String token = Authenticator.generateC3KeyAuthToken(new String(Base64.getDecoder().decode(parts[1])),
         //                                                                   pk.toString());
         //               auth = Authenticator_Methods.tokenPrefix(AuthenticationKind.KEY) + token;
         //            } catch (Exception e) {
         //               throw Err.wrap(e);
         //            }
         //         }
         return auth;
      }

      public String endpoint(boolean failIfNotConfigured) {
         REST ths = inst();
         String url = (ths != null ? ths.url() : null);
         if (Str.isEmpty(url))
            url = Ctx.asRoot(() -> ths.config().url());
         //         if (Str.isEmpty(url))
         //            url = configuredAnnotations.url();
         if (Str.isEmpty(url))
            return Fail.ifMissing(null, failIfNotConfigured, ths.type().name(), "url");

         verify(action, url, "url");
         if (url.equals("c3Server"))
            url = hostUrl();

         if (url != null && !url.endsWith("/") && !url.startsWith(Vault.VAULT_PREFIX))
            url += "/";
         return url;
      }

      private void verify(Action action, String ext, String name) {
         if (Str.isEmpty(ext))
            throw Err.formatted("@rest annotation is required for {} for {}", name, action.name());
      }

      /**
       * Returns whether there is a rest annotation on this FunctionParam.
       * (Factored out check from functionAnnotation above)
       */
      private boolean checkRestAnnotation(FunctionParam a) {
         return !(a == null || a.annotations() == null || a.annotations().rest() == null);
      }
   }
}
