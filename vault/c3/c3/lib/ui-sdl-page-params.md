`/Users/lefv/c3/c3ui/repo/c3ui/uiInfrastructure/src/ui/components/site/UiSdlSite.c3typ`

```ad-note typescript

 /**

* Triggered whenever the page parameters need to be updated.

* @param id

* Id of the component.

* @param pageParams

* The mapping of page params to their corresponding values.

*

* @return an 'PAGE_PARAMS_SET' action for this instance with the following properties:

* - payload.pageParams {map<string, string | [string]>} The field that contains the page params

*/

@uiSdlActionCreator(actionType='PAGE_PARAMS_SET')

@typeScript(env='client')

setPageParamsAction: function(id: string, pageParams: map<string, string | [string]>): UiSdlPageParamsSetAction

```



```
component A
"redirectLink": {

"internal": true,

"href": "/scenarios/{{id}}"

"href": "/scenarios/{{id}}?missileId={{missile.id}}"


...

component B

"dataSpec": {

"dataType": {

"typeName": "IRModel"

},

"actionArgs": {

"spec": {

"include": "missile"

}

},

"filter": "missile.id == '${missileId}'",
```