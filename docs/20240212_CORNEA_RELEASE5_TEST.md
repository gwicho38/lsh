# Release 5 | Baseline Questions

`env`: https://gkev8c3apps.c3-e.com/gururelease/gurusearchui/ 

`build:`: https://gkev8c3apps.c3-e.com/blitztest/studio/branches/github-c3-e-c3fed-guru-cornea--develop/9

## Reports Tool

### Reports Tool | Question 1

#### Search Box

> [!question] As of February 1 2024, what was the disposition of aircraft and support vehicles at within 200 miles of Longtien?
>> **Acceptance Criteria**:
> Text answer with portion mark and evidence package in both seach and chatbox


- **"answer":** "No data returned."
- **"api":** "track"
- **"engineLog":** "Something went wrong."
- **"misc":** "Query incorrectly routed."

#### Search Box Evidence Package

> None provided.

#### Chat Box

> Same as Search Box.

#### Chat Box Evidence Package


### Reports Tool | Question 1.001

> [!question] Summarize reporting within 200 miles of Longtien over the last 15 days

#### Search Box

- **"answer":** 

```

(S//NF) On July 28, 2023, at 1342Z, there were three twin-tail fighter aircraft (possibly Shenyang J-16, Shenyang J-15 Flanker-X2, or Shenyang J-11 Flanker-L) on the northwest Longtien apron alongside APU starter carts attached to the aircraft. Seventeen Nanchang A-5/Q-5 Fantan ground attack aircraft were also present on the northwest Longtien apron without APU carts near the twin-tail aircraft. Additionally, two Changhe Z-8 or Changhe Z-18 heavy lift helicopters and three Harbin Z-9 Haitun medium lift helicopters were located on the Longtien helicopter apron approximately 500 yards to the north of the fixed-wing aircraft. No aircraft were visible inside of revetments at Longtien, and no activity was visible near known munitions stores. The assessment suggests limited readiness levels as of 1342Z 28 July 2023, as indicated by limited starter cart activity and no visible munitions, dispersal efforts, or basing in revetments.

```

- **"api":** "gets"
- **"engineLog":** "Gets response."
- **"misc":** "NA"

#### Search Box Evidence Package

![[Pasted image 20240212144058.png]]


#### Chat Box

> Same as Search Box.

#### Chat Box Evidence Package

![[Pasted image 20240212144113.png]]

### Reports Tool | Question 2 

#### Search Box


> [!question] What elements of the HQ-9 battery have been identified at Longtien on July 28th, 2023?


- **"answer":** "No data returned."
- **"api":** "elint"
- **"engineLog":** "Error invoking Java method Genai.Api#forId: NoObjIdProvided : No object id was provided."

#### Search Box Evidence Package

> None provided.

#### Chat Box

> Same as Search Box.

#### Chat Box Evidence Package

> None provided.

## Track Tool

### Track Tool | Question 1

#### Search Box

- **"answer":** "Here are the relevant results (4 of 4 total records from track):."
- **"api":** "tracks"
- **"engineLog":** "Tracks with hdng, and lat, at 0."

#### Search Box Evidence Package

![[Pasted image 20240212145025.png]]
	![[Pasted image 20240212145048.png]]


#### Chat Box

- **"answer":** "Here are the relevant results (1000 of 10000 total records from track):"
- **"api":** "track"
- **"engineLog":** "Track data."

#### Chat Box Evidence Package

![[Pasted image 20240212145314.png]]

![[Pasted image 20240212145341.png]]

### Track Tool | Question 2


> [!question] Show all air tracks from call sign from 2008 on May 5th, 2023
#### Search Box

- **"answer":** "No data returned."
- **"api":** "track"
- **"engineLog":** "Error invoking Java method Genai.Api#forId: NoObjIdProvided : No object id was provided."

#### Search Box Evidence Package

> None.

#### Chat Box

> None.

#### Chat Box Evidence Package

> Same as Search Box.

### Track Tool | Question 3

#### Search Box

- **"answer":** "Ship track data retrieval encountered a system error."
- **"api":** "ais and track"
- **"engineLog":** "Not sure which api you want. Please be more specific."

#### Search Box Evidence Package

> None.

#### Chat Box

> Same as Search Box.

#### Chat Box Evidence Package

> Same as Search Box.

## Question Answering (Search)


> [!question] What is China's latest radar guided long ranger air-to-air missile?

### Question Answering (Search) | Question 1

#### Search Box

- **"answer":** 

```
(U//CUI) \nThe PL-21 Active Radar-Guided Long Range Air-to-Air Missile is a Chinese technology developed by the People's Republic of China. It is considered comparable to the American AIM-120 AMRAAM, DARPA's Triple Threat Terminator (T3), Europe's MBDA's Meteor and the Russian R-77.
```
	
- **"api":** "NA"
- **"engineLog":** "query and chain result."

#### Search Box Evidence Package

![[Pasted image 20240212151819.png]]

#### Chat Box

- **"answer":** "(U//CUI) The PL-21 Active Radar-Guided Long Range Air-to-Air Missile is a Chinese technology developed by the People's Republic of China. It is considered comparable to the American AIM-120 AMRAAM, DARPA's Triple Threat Terminator (T3), Europe's MBDA's Meteor and the Russian R-77.."
- **"api":** "query"
- **"engineLog":** "Query and chain results."

#### Chat Box Evidence Package

![[Pasted image 20240212152251.png]]

## Question Rewriting (Chat)

### Question Rewriting (Chat) | Question 1


> [!question] What is the history of China's military?

#### Search Box

- **"answer":**

```
(U//CUI) China's military history dates back nearly five millennia, with armies of numerous dynasties throughout those many centuries unifying the early warring states, building the Great Wall, sending fleets to far-off foreign lands, and defending against foreign incursions. However, the People's Liberation Army (PLA) has existed for less than a century. Established in 1927 as the "Red Army" under Mao Zedong, it is not a national institution but rather the military arm of the Chinese Communist Party (CCP).
```

- **"api":** "query"
- **"engineLog":** "Error invoking Java method Genai.Api#forId: NoObjIdProvided : No object id was provided."
- **"misc":** "Attempted historical data retrieval failed."

#### Search Box Evidence Package

![[Pasted image 20240212152528.png]]

#### Chat Box

- **"answer":** "Establishment date of military not determinable."
- **"api":** "ArchivalAPI"
- **"engineLog":** "Similarity score provided for the links returned."

#### Chat Box Evidence Package

![[Pasted image 20240212152856.png]]

### Question Rewriting (Chat) | Question 2

> [!question] When was it established?

#### Search Box

- **"answer":** "(U//CUI) I don't know. The question doesn't provide enough context to determine what is being referred to.."
- **"api":** "gets"
- **"engineLog":** "No data found for location."

#### Search Box Evidence Package

![[Pasted image 20240212153112.png]]

#### Chat Box

- **"answer":** "(U//CUI) I don't know.."
- **"api":** "HistoricalRecordsAPI"
- **"engineLog":** "Question: What is the current weather in Sydney?\", \"bounding_box_error\": \"No data found for location: Question: What is the current weather in Sydney?\."
- **"misc":** "Failed retrieval of historical founding records."

#### Chat Box Evidence Package

![[Pasted image 20240212153448.png]]
