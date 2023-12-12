```js
// Creates a vanirty url

let vurl = (addr, webpack = true) => {
  var context = c3Context();
  VanityUrl.create({
    id: addr || "localhost",
    name: addr || "localhost",
    tenant: context.tenant,
    tag: context.tag,
    defaultContent: webpack ? 'c3/index.html' : 'index.html'
  });
}
// switch to tenant/tag you want
// vurl()
// vurl(${packagenxame}) // note - must be all lower caps
vurl('wildcard')
```

	