import csv
import json

def getLinkedInIdNameMap(solutionEngineersFile):
    linkedInIdNameMap = {}
    f = open(solutionEngineersFile, 'r')
    engineers = json.load(f)
    for engineer in engineers:
        linkedInIdNameMap[engineer['LinkedInId']] = engineer['Name']
    
    return linkedInIdNameMap

# This function transforms LinkedIn data from csv format to json format
def transformLinkedIn(solutionEngineersFile, inputFile, outputFile):

    linkedInIdNameMap = getLinkedInIdNameMap(solutionEngineersFile)

    jsonArray = []
      
    # read csv file in the format and create a json array object:
    # Seat holder,Seat id,Seat Location,Active Days,Profiles viewed,Projects created,Updated stage,Profiles saved,\
    # Searches saved,Search alerts saved,Searches performed,Messages sent,Messages accepted,Messages declined,\
    # Message response rate,Message acceptance rate,Message decline rate
    with open(inputFile, encoding='utf-8-sig') as csvf: 
        #load csv file data using csv library's dictionary reader
        csvReader = csv.DictReader(csvf) 

        #convert each csv row into python dict
        for row in csvReader:
            if row['Seat id'] in linkedInIdNameMap:
                row['Seat holder'] = linkedInIdNameMap[row['Seat id']] 
                #add this python dict to json array
                jsonArray.append(row)
  
    #convert python jsonArray to JSON String and write to file in the following format
    #     {
    #     "Seat holder": "Jane Doe",
    #     "Seat id": "232093271",
    #     "Seat Location": "Redwood City, CA",
    #     "Active Days": "64",
    #     "Profiles viewed": "62",
    #     "Projects created": "0",
    #     "Updated stage": "3",
    #     "Profiles saved": "74",
    #     "Searches saved": "0",
    #     "Search alerts saved": "0",
    #     "Searches performed": "63",
    #     "Messages sent": "0",
    #     "Messages accepted": "0",
    #     "Messages declined": "0",
    #     "Message response rate": "0",
    #     "Message acceptance rate": "0",
    #     "Message decline rate": "0"
    # },
    with open(outputFile, 'w', encoding='utf-8') as jsonf: 
        jsonString = json.dumps(jsonArray, indent=4)
        jsonf.write(jsonString)

# Save the 'LinkedIn_RawData.csv'
inputFile = r'config/LinkedIn_RawData.csv'
solutionEngineerFile = r'config/solutionEngineers.json'
outputFile = r'output/LinkedIn_RawData.json'
transformLinkedIn(solutionEngineerFile, inputFile, outputFile)
