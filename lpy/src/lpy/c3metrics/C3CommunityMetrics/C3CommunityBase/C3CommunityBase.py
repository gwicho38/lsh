import os
import json
import datetime
import logging
import csv
import time
import requests
import utility.RunTime as RunTime

class C3CommunityBase:
    # private:
    _url = "https://community.c3.ai"
    _token = ""
    _c3CommunityId = ""
    _headers = {}
    _api = ""
    _outputDir = "output/"
    _configDir = "config/"
    _solutionEngineersFileName = ""
    _solutionEngineers = {}
    _categoryIds = {}
    _outputFileName = ''

    def __init__(self, c3CommunityId, token, outputFileName=None, solutionEngineersFileName=None):
        print("C3CommunityBase")
        # self._c3CommunityId = c3CommunityId
        # self._token = token
        # self._headers['Accept'] = 'application/json'
        # self._headers['Api-Key'] = self._token
        # self._solutionEngineersFileName = solutionEngineersFileName
        # self._readSolutionsEngineers()
        # self._createOutputDir()
        # self._logger = logging.getLogger()
        # self._outputFileName = outputFileName
        # self._runTime = RunTime.RunTime(self._outputDir, self._outputFileName[:-4])

    def _readSolutionsEngineers(self):
        if self._solutionEngineersFileName is None:
            self._solutionEngineersFileName = "../config/solutionEngineers.json"

        f = open(self._configDir + "solutionEngineers.json", "r")
        data = f.read()
        solutionEngrMap = json.loads(data)
        f.close()

        # The expected format for SolutionEngineers.json file is:
        # [
        #     {
        #         "Name": "Full_Name",
        #         "Title": "String",
        #         "Location": "Bangalore",
        #         "Start Date": "4/24/23",
        #         "Email": "Full_Name@c3.ai",
        #         "GithubId": "c3-Full_Name",
        #         "Manager": "Full_Name's Manager",
        #         "Team": "APAC",
        #         "Peer Group": "D"
        #     },
        # ]
        # Create triple index on githubId, emailId, fullName and C3CommunityId
        for se in solutionEngrMap:
            k = se['GithubId']
            v = [se['Email'], se['Name'], se['Title'], se['C3CommunityId']]
            self._solutionEngineers[k.lower()] = v

    def _createOutputDir(self):
        if not os.path.isdir(self._outputDir):
            os.makedirs(self._outputDir)

    def _runQuery(self):
        for engineer in self._solutionEngineers:
            self._runQueryAPI(engineer)

    # Helper function to extract only the date from a datetime string
    # '2019-07-12T10:24:43.727-0700' -> 2019-07-12
    def _stripDate(self, xDate):
        dateStr = ""
        if xDate is not None:
            dateStr = datetime.datetime.strptime(
                xDate, "%Y-%m-%dT%H:%M:%S.%f%z").date().isoformat()

        return dateStr

    def _runQueryAPI(self):
        pass  # Defined in subclass

    def _createOutputFile(self, header):
        self._csvfile = open(self._outputDir + self._outputFileName, "w")
        self._f = csv.DictWriter(self._csvfile, fieldnames=header)
        self._f.writeheader()

    def _repeatQuery(self, response):
        statusCode = response.status_code
        self._logger.debug(response)
        if statusCode == 429:
            responseJson = response.text
            waitTime = 0
            # The rate limit message can be either plain text or json.
            # If the error message is plain text, then sleep for 5secs.
            # If the message is in json, then the wait time is sent by the server.
            if 'Slow down' in responseJson:
                waitTime = 5
                self._logger.debug("Rate limit hit, waiting for(default of 5secs): " + str(waitTime) + " secs")
            else:
                responseJson = response.json()
                waitTime = responseJson['extras']['wait_seconds']
                self._logger.debug("Rate limit hit, waiting for: " + str(waitTime) + " secs")
            time.sleep(waitTime)
            return True
        else:
            return False

    def _createCategoryMap(self, categories):
        for c in categories:
            self._categoryIds[c['id']] = c['name']
            if c['has_children']:
                self._createCategoryMap(c['subcategory_list'])

    def _getCategoryIds(self):
        params = {}
        params['include_subcategories'] = 'true'
        api = '/categories.json'
        while True:
            try:
                response = requests.get(
                    self._url + api,
                    headers=self._headers,
                    params=params
                )
            except Exception as e:
                self._logger.error(e)
                exit

            if self._repeatQuery(response):
                self._logger.debug("Hit rate was limit")
                continue

            responseJson = response.json()
            self._createCategoryMap(responseJson['category_list']['categories'])
            break

        def writeCategoryCSV(filename, header):
            csvfile = open(self._outputDir + filename, "w")
            f = csv.DictWriter(csvfile, fieldnames=header)
            f.writeheader()
            row = {}
            for k, v in self._categoryIds.items():
                row['Category Id'] = k
                row['Category Name'] = v
                f.writerow(row)
            csvfile.close()

        outputHeader = [
            "Category Id",
            "Category Name"
            ]
        writeCategoryCSV("c3community_category.csv", outputHeader)

    def _stripDate(self, xDate):
        dateStr = ""
        if xDate is not None:
            dateStr = datetime.datetime.strptime(
                xDate, "%Y-%m-%dT%H:%M:%S.%f%z").date().isoformat()

        return dateStr

    def runC3CommunityQuery(self):
        self._runTime._start()
        self._getCategoryIds()
        self._runQuery()
        self._runTime._stop()
