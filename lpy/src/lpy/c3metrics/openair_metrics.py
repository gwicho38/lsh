import csv
import json

f = open("config/solutionEngineers.json", "r")
data = f.read()
f.close()
engineers = json.loads(data)

solutionEngineers = {}
for se in engineers:
    email = se['Email'].lower()
    solutionEngineers[email] = [se['Email'], se['Name'], se['Title']]

inputCsvFile = open("config/openair_raw.csv", "r", encoding='utf-8-sig')
inputFile = csv.DictReader(inputCsvFile)

outputCsvFile = open("output/openair_metrics.csv", "w")
outputHeader = [
    "Email",
    "Name",
    "Title",
    "Hours",
    "Date",
    "Customer",
    "Project",
    "Task"
]

outputFile = csv.DictWriter(outputCsvFile, fieldnames=outputHeader)
outputFile.writeheader()

for dict in inputFile:
    key = dict['User - Email'].lower() if dict['User - Email'] is not None else ""
    if key in solutionEngineers:
        row = {}
        row['Email'] = key
        row['Name'] = solutionEngineers[key][1]
        row['Title'] = solutionEngineers[key][2]
        row['Hours'] = dict['Time (Hours)']
        row['Date'] = dict['Date']
        row['Customer'] = dict['Customer - Nickname']
        row['Project'] = dict['Project - Name']
        row['Task'] = dict['Task - Phase/Task name']
        print(row)
        outputFile.writerow(row)

inputCsvFile.close()
outputCsvFile.close()
