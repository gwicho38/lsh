import os
import json
import datetime
import logging
import csv
import requests
import time
import utility.RunTime as RunTime

class GithubBase:
    # private:
    _url = "https://api.github.com"
    _token = ""
    _githubId = ""
    _headers = {}
    _api = ""
    _owner = "c3-e"
    _outputDir = "output/"
    _configDir = "config/"
    _solutionEngineersFileName = ""
    _federalRepoFileName = ""
    _commercialRepoFileName = ""
    _federalRepoList = []
    _commercialRepoList = []
    _solutionEngineers = {}
    _pullsProcessed = {} # Hashmap of repo => pull# and the page# that was looked at
    _pullsLastRecorded = {} # Hashmap of repo => pull# read from the <output>.csv file
    _pullsProcessedFileName = '' # File contains hashmap of repo => pull# and the page# in json format
    _outputFileName = ""

    def __init__(self, githubId, token,
                 outputFileName=None,
                 solutionEngineersFileName=None,
                 federalRepoFileName=None,
                 commercialRepoFileName=None):
        print("hi")

        # self._githubId = githubId
        # self._token = token
        # self._headers['Authorization'] = 'token ' + self._token
        # self._solutionEngineersFileName = solutionEngineersFileName
        # self._federalRepoFileName = federalRepoFileName
        # self._commercialRepoFileName = commercialRepoFileName
        # self._readFederalRepoList()
        # self._readCommercialRepoList()
        # self._readSolutionsEngineers()
        # self._createOutputDir()
        # self._logger = logging.getLogger()
        # self._apiCount = 0
        # self._outputFileName = outputFileName
        # self._pullsProcessedFileName = self._outputFileName[:-4] + '_last_processed.json'
        # self._runTime = RunTime.RunTime(self._outputDir, self._outputFileName[:-4])

    def _readRepoList(self, repoFileName):
        f = open(repoFileName, "r")
        data = f.read()
        repoList = data.rstrip().split('\n')
        f.close()
        return repoList

    def _readFederalRepoList(self):
        if self._federalRepoFileName is None:
            self._federalRepoFileName = "config/fedRepos.txt"
        self._federalRepoList = self._readRepoList(self._federalRepoFileName)

    def _readCommercialRepoList(self):
        if self._commercialRepoFileName is None:
            self._commercialRepoFileName = "config/commercialRepos.txt"
        self._commercialRepoList = self._readRepoList(self._commercialRepoFileName)

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
            self._solutionEngineers[v[0].lower()] = v
            self._solutionEngineers[v[1].lower()] = v

    def _createOutputDir(self):
        if not os.path.isdir(self._outputDir):
            os.makedirs(self._outputDir)

    def _isAccessible(self, repo):
        api = "/repos/" + self._owner + "/" + repo
        try:
            # Set the timeout to 60secs for now.
            response = requests.get(self._url + api, headers=self._headers, timeout=60)
        except Exception as e:
            self._logger.error(e)
        
        self._repeatQuery(response)
        return response.status_code == 200

    def _runQuery(self, repos):

        while len(repos):
            repo = repos.pop(0)
            if self._isAccessible(repo) == False:
                self._logger.error("Repo not accessible: " + repo)
            elif self._runQueryAPI(repo) == False:
                self._logger.error("Couldn't query repo: " + repo)
            # time.sleep(3)

    # Helper function to extract only the date from a datetime string
    # "2023-03-28T23:12:15Z" -> 2023-03-28
    def _stripDate(self, xDate):
        dateStr = ""
        if xDate is not None:
            dateStr = datetime.datetime.strptime(xDate, "%Y-%m-%dT%H:%M:%SZ").date().isoformat()
        
        return dateStr

    def _runQueryAPI(self, repo):
        pass # Defined in subclass

    def _createOutputFile(self, header):
        self._csvfile = open(self._outputDir + self._outputFileName, "w")
        self._f = csv.DictWriter(self._csvfile, fieldnames=header)
        self._f.writeheader()

    def _repeatQuery(self, response):
        statusCode = response.status_code
        self._logger.debug(response)
        if statusCode == 403:
            self._logger.debug(response.text)
            self._logger.debug(response.headers)
            remaining = response.headers['X-RateLimit-Remaining']
            self._logger.debug("Ratelimit remaining - : " + str(remaining))
            if remaining == '0':
                resetTime = int(response.headers['X-RateLimit-Reset'])
                currTime = int(time.time())
                self._logger.info("resetTime: " + str(resetTime) + ", currTime: " + str(currTime))
                if resetTime > currTime:
                    sleepTime = resetTime - currTime + 10
                    self._logger.info("Sleeping for: " + str(sleepTime))
                    time.sleep( resetTime - currTime )
                else:
                    self._logger.info("Not sleeping...")
            return True
        else:
            return False

    # Reads from the .json file and creates a map of:
    # {
    #    'repoName' : {
    #        'page': int,
    #        'pullNumber': int
    #    }
    # }
    def _readPullsProcessed(self):
        fileName = self._outputDir + self._pullsProcessedFileName
        try:
            jsonfile = open(fileName, "r")
            self._pullsProcessed = json.load(jsonfile)
            jsonfile.close()
        except Exception as e:
            self._logger.error("Did not find file: " + fileName)

    # Writes the following hashmap to the .json file:
    # {
    #    'repoName' : {
    #        'page': int,
    #        'pullNumber': int
    #    }
    # }
    def _writePullsProcessed(self):
        jsonfile = open(self._outputDir + self._pullsProcessedFileName, 'w')
        json.dump(self._pullsProcessed, jsonfile, indent=4)
        jsonfile.close()

    # This function has to be implemented in the child class. 
    # It should read parse the <output>.csv file and create a mapping of 'RepoName' -> MaxPullNumber
    def _readPullsLastRecorded(self):
        pass

    def runGithubQuery(self):
        self._runTime._start()
        self._runQuery(self._federalRepoList)
        self._runQuery(self._commercialRepoList)
        self._runTime._stop()
