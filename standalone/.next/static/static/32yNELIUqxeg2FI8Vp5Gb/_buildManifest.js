self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/webhook-test/:path*",
        "destination": "/api/webhook-test/:path*"
      },
      {
        "source": "/webhook/:path*",
        "destination": "/api/webhook/:path*"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()