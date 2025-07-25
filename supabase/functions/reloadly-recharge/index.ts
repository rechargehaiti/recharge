@@ .. @@
   try {
     const { phoneNumber, operatorId, amount, currency = 'BRL' } = await req.json()
   }

-    const clientId = Deno.env.get('DINGCONNECT_CLIENT_ID')
-    const clientSecret = Deno.env.get('DINGCONNECT_CLIENT_SECRET')
+    const clientId = Deno.env.get('RELOADLY_CLIENT_ID')
+    const clientSecret = Deno.env.get('RELOADLY_CLIENT_SECRET')
     
     const isProperlyConfigured = clientId && 
       clientSecret && 
-      clientId !== 'your-dingconnect-client-id' && 
-      clientSecret !== 'your-dingconnect-client-secret' &&
+      clientId !== 'your-reloadly-client-id' && 
+      clientSecret !== 'your-reloadly-client-secret' &&
       clientId.length >= 20 &&