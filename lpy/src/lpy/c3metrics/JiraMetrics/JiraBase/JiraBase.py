import os
import json
import datetime
import logging
import csv
import utility.RunTime as RunTime
import time

class JiraBase:
    # private:
    _url = "https://c3energy.atlassian.net"
    _token = ""
    _jiraId = ""
    _headers = {}
    _api = ""
    _outputDir = "output/"
    _configDir = "config/"
    _solutionEngineersFileName = ""
    _solutionEngineers = {}
    _outputFileName = ''

    def __init__(self, jiraId, token, outputFileName, solutionEngineersFileName=None):
        self._jiraId = jiraId
        self._token = token
        self._headers['Accept'] = 'application/json'
        self._solutionEngineersFileName = solutionEngineersFileName
        self._readSolutionsEngineers()
        self._createOutputDir()
        self._logger = logging.getLogger()
        self._outputFileName = outputFileName
        self._runTime = RunTime.RunTime(self._outputDir, self._outputFileName[:-4])

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
        # Create triple index on githubId, emailId and fullName
        for se in solutionEngrMap:
            k = se['GithubId']
            v = [se['Email'], se['Name'], se['Title']]
            self._solutionEngineers[k.lower()] = v

    def _createOutputDir(self):
        if not os.path.isdir(self._outputDir):
            os.makedirs(self._outputDir)

    def _runQuery(self):
        for engineer in self._solutionEngineers:
            if engineer:
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

    def runJiraQuery(self):
        self._runTime._start()
        self._runQuery()
    
    def _isRateLimit(self, response):
        rc = False
        if response.status_code == 429:
            retryAfter = response.headers['Retry-After']
            self._logger.warning("Status Code: " + str(response.status_code) + ", Retry after: (" + retryAfter + ")")
            time.sleep(int(retryAfter))
            rc = True

        return rc

    def __del__(self):
        self._runTime._stop()
