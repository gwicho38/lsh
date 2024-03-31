/*
 * Copyright 2009-2020 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

package c3.platform.service.rest;

import java.net.URI;

import org.apache.http.annotation.Contract;
import org.apache.http.annotation.ThreadingBehavior;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;

@Contract(threading = ThreadingBehavior.UNSAFE)
class HttpDeleteWithBody extends HttpEntityEnclosingRequestBase {

   public static final String METHOD_NAME = "DELETE";

   public String getMethod() {
      return METHOD_NAME;
   }

   public HttpDeleteWithBody(final String uri) {
      super();
      setURI(URI.create(uri));
   }

   public HttpDeleteWithBody(final URI uri) {
      super();
      setURI(uri);
   }

   public HttpDeleteWithBody() {
      super();
   }
}
