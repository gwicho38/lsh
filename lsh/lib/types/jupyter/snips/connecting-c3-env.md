```python3
def get_c3(url, tenant=None, tag=None, auth=None):
    try:
        from urllib.request import urlopen
    except ImportError:
        from urllib2 import urlopen
    from types import ModuleType
    c3iot = ModuleType('c3IoT')
    c3iot.__loader__ = c3iot
    src = urlopen(url + '/public/python/c3remote_bootstrap.py').read()
    exec(src, c3iot.__dict__)
    return c3iot.C3RemoteLoader.typeSys(url, tenant, tag, auth, define_types=True)
c3 = get_c3("http://wildcard:8080", tenant="mdaPTS", tag="dev")

```
