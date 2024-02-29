## Given the Following HTML

### HTML Client Code

![[Pasted image 20230131121008.png]]

		[## PHP Back End Code

![[Pasted image 20230131121121.png]]

## Identification 

- Attack types 

- Source of vulnerabilities

## Vulnerabilities

- It does not sanitize for invalid values mapped to the ‘action’ key.

- It echoes back any non-sanitized value mapped to the ‘login’ field.

## Remediation

- Sanitizing the input mapped to all keys. Doing so should be standard practice and can be done with built in php functions (e.g., using the built in “filter_input_array”), as well as programming logic.

	- Providing for programming logic that catches values of keywords that do not map to expected input. Particularly, the [XSS attack relied on the fact that there was no logic to handle a value mapped to action that was not ‘login’ or ‘register’. In these cases, the code “fell-through” and displayed the login page. Adding an “else” clause to the ‘action’ check logic that clears any query inputs and redirects to the index.php page could help.

- Removing or sanitizing any programming logic that allows users to inject arbitrary input to be executed by the server. In this case, the default header.php includes logic that calls a php “echo” function that receives any input mapped to the login keyword form.