import csv
import json

def csv_to_json(csvFilePath, jsonFilePath):
    jsonArray = []
      
    #read csv file
    with open(csvFilePath, encoding='utf-8-sig') as csvf: 
        #load csv file data using csv library's dictionary reader
        csvReader = csv.DictReader(csvf) 

        #convert each csv row into python dict
        for row in csvReader: 
            # del row[''] # Eliminate empty headers
            #add this python dict to json array
            if row['Name']:
                jsonArray.append(row)
  
    #convert python jsonArray to JSON String and write to file
    with open(jsonFilePath, 'w', encoding='utf-8') as jsonf: 
        jsonString = json.dumps(jsonArray, indent=4)
        jsonf.write(jsonString)

# Save the 'Roster' tab of 
# https://c3e-my.sharepoint.com/:x:/g/personal/naresh_shah_c3_ai/Ed1U9PcQM7hPqCuM4M8Qg4AB2qjoTGEPrm0MAqcvSVX7Hg?e=vLLBf2
# file as MasterList.csv file in the below location          
csvFilePath = r'config/MasterList.csv'
jsonFilePath = r'config/solutionEngineers.json'
csv_to_json(csvFilePath, jsonFilePath)
