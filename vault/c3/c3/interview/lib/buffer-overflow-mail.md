```c

char *mail_auth(char * mechanism, authresponse_t resp, int argc, char *argv[]){
  chart tmp[MAILTMPLEN];
  AUTHENTICATOR * AUTH;

  ucase(strcpy(tmp, mechnism));
  for(auth = mailauthenticators; auth; auth = auth->next)

    if(auth->serer && !strcmp(auth->name, tmp))
      return (*auth->server) (resp, argc, argv);

	return NIL; 
}

```

# Solution

The above shows part of the vulnerable code on the University of Washington’s IMAP server, which was corrected in 1998. We can see that it never checks the size of the data  in mechanism before copying to tmp , which could result in a buffer overflow. The error is easily resolved by a check using strlen (mechanism), before copying, or by using n bytes copy functions, like strncpy