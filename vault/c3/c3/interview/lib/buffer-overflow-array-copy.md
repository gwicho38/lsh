# Problem

```c

long mail_valid_net_parse_work(char *name, NETMBX *mb, char *service){
  int i, j;
  #define MAILTMPLEN 1024 /* size of temporary buffer */
  char c, *s, *t, *v, tmp[MAILTMPLEN], arg[MAILTMPLEN];
  if(t-v){
    strncpy(t= tmp, v, j);
    tmp[j] = '\0';
    if(*t == '"'){
      for(v = arg, i = 0; ++t; (c= *t++) !='"';){
	        if(c == '//')
		          c= *t++;
		        arg[i++] = c;
			} 
		}
	} 
}
```

# Solution

In line 20, there is a search for a double quotation mark within the string being parsed. If it is found, the loop in line 22 will copy until a second double quotation mark is found. Clearly, if a string is entered that only has one such character, the loop will keep copying, resulting in a stack overflow. https://www.welivesecurity.com/2017/01/30/examples-vulnerable-code-find/
