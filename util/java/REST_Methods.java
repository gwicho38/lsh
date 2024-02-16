/*
 * Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

package c3.platform.service.rest;

import c3.platform.action.Action;
import c3.platform.err.Err;
import c3.platform.typesys.value.Map;
import c3.platform.typesys.value.json.JsonNode;

public class REST_Methods extends REST_MethodsBase {

   public REST_Methods(REST.Subtype type) {
      super(type);
   }

   @Override
   public Object _exec(Action action) {
      return RESTEngine.instance.execute(action);
   }

   @Override
   public boolean isUrlConfigured() {
      // TODO: add implementation for REST.isUrlConfigured;
      return this.subtype().make().apiUrl() != null;
   }

   @Override
   public String apiUrl(REST ths) {
      return ths.config().url();
   }

   @Override
   public String apiAuth(REST ths) {
      return ths.config().secretValue("auth");
   }

   @Override
   public void setApiUrlAndAuth(String url, String auth, String configOverride) {
      this.subtype().make().config().withUrl(url).setConfig(configOverride);
      this.subtype().make().config().withAuth(auth).setSecret(configOverride);
   }

   @Override
   public String sendTextRequest(REST ths, String method, String uri, String request, Map<String, String> headers) {
      return RESTEngine.instance.execute(ths.type(), method, uri, request);
   }

   @Override
   public JsonNode sendJsonRequest(REST ths, String method, String uri, JsonNode request, Map<String, String> headers) {
      // TODO: add implementation for REST.sendJsonRequest;
      throw Err.notImplemented();
   }
}
