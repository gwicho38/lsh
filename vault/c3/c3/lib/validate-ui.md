```js

function validateUI(appPrefix) {  
  let x = UiTagMetadataStore.files({ path: `/**/${appPrefix}.*.json` });  
  let success = [];  
  let errors = [];  
    
  x.forEach((o) => {  
    try {  
      o.readObj();  
      success.push(o.url);  
    } catch (e) {  
      errors.push({ file: o.url, error: e });  
    }  
  });  
    
  return { success, errors };  
}

```
