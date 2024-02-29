Hi Team,

We are excited to announce a key improvement for Python users that will make the developing experience more transparent and seamless.

This release provides Python debugger support in the C3 AI Visual Studio Code Extension. Developers can now place breakpoints, inspect variables, step-in into Python functions and debug Python code deployed to a C3 environment either local or remote.

Some of the key capabilities of the debugger include:

The ability to debug methods inherited from mixins or extended Types

The ability to recursively step into Python methods called by Python other methods

The ability to place conditional breakpoints based on variable expression

The ability to detect and stop at uncaught exceptions that the code raises

You can watch a 13-min [tutorial](https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fc3e-my.sharepoint.com%2F%3Av%3A%2Fg%2Fpersonal%2Fjinlin_he_c3_ai%2FESkEhZydT1JCiba27Q_AlnwBKZA9oUIvVl7uZl1W49FjiQ%3Fe%3DKDjly2&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C283aae426de54c852eea08da73fb26ff%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637949819789864287%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C3000%7C%7C%7C&sdata=iNfxymxIixAGrteqt5CfLCG%2FNR035mzcDWPT990dzuo%3D&reserved=0 "https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fc3e-my.sharepoint.com%2F%3Av%3A%2Fg%2Fpersonal%2Fjinlin_he_c3_ai%2FESkEhZydT1JCiba27Q_AlnwBKZA9oUIvVl7uZl1W49FjiQ%3Fe%3DKDjly2&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C283aae426de54c852eea08da73fb26ff%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637949819789864287%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C3000%7C%7C%7C&sdata=iNfxymxIixAGrteqt5CfLCG%2FNR035mzcDWPT990dzuo%3D&reserved=0") I recorded for debugging setup and demo and [debugger documentation](https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fdeveloper.c3.ai%2Fdocs%2F7.30.0%2Ftopic%2Fdebugger-documentation&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C283aae426de54c852eea08da73fb26ff%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637949819789864287%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C3000%7C%7C%7C&sdata=6pmLS5x5yUfTxOy92UsCxCv0K67bM0%2F91R%2FGPc%2FHGfw%3D&reserved=0 "https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fdeveloper.c3.ai%2Fdocs%2F7.30.0%2Ftopic%2Fdebugger-documentation&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C283aae426de54c852eea08da73fb26ff%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637949819789864287%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C3000%7C%7C%7C&sdata=6pmLS5x5yUfTxOy92UsCxCv0K67bM0%2F91R%2FGPc%2FHGfw%3D&reserved=0") on the developer portal in the written format.

Thank you to [@Camille Masset](mailto:camille.masset@c3.ai "mailto:camille.masset@c3.ai") and [@Willy Douhard](mailto:willy.douhard@c3.ai "mailto:willy.douhard@c3.ai") for making this happen. Thanks to [@Romain Juban](mailto:romain.juban@c3.ai "mailto:romain.juban@c3.ai") and [@Zizhuo Ren](mailto:zizhuo.ren@c3.ai "mailto:zizhuo.ren@c3.ai") for the help during user testing.

```python
ClusterConfig.inst().setConfigValue("actionDebuggerEnabled", true);
````
