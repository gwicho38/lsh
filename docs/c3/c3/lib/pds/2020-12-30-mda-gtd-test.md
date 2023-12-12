 Testing File Upload

2022-12-30

03:37:26

#### Assessment Requirement Data Source

	CAC File Uploaded: 

		CAC-1234: Version 1.0.0

KTP Diff: 


		![[Pasted image 20221230153809.png]]

Activity Recorded: 

		![[Pasted image 20221230153931.png]]

CAC Parsed:

		![[Pasted image 20221230154143.png]]

> [!NOTE] Note
> Results took > 1 minute to process.
> This is consistent with the batch processing logic in the app.

### RawCldd

	filename: `GTI-08A-CLDD_v1.1`

	parse result: success

	ui change: events/{eventId} 
					tab: Outputs
					panel: Assets

	BFAs populated and visualized.

	![[Pasted image 20221230170424.png]]

![[Pasted image 20221230170440.png]]

### KAPS

	Resulting Types: ['KtpPriority', 'RawKtp']

	Filename: GTI-08A-KAPS_v1.1

	parse result: success

	ui change: 

		route: events/{eventId}
		tab: Overview

		![[Pasted image 20221230171247.png]]

### ETML

> [!important] Antecedent Step for ETML Parse
> ADPs must be parsed prior to uploading ETML files. These contain missiles.
> For an example of such parsing, see http://localhost:8888/notebooks/Parser_Test_Main.ipynb

	Resulting Types: ['MissileReference']

	Filename: 'GTI-08A-ETML_v1.1.pdf'

	Parse Result: success

	UI Change: 

	![[Pasted image 20221230172419.png]]

	![[Pasted image 20221230172517.png]]

![[Pasted image 20221230172704.png]]