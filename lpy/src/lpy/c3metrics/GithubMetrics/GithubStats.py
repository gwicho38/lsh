import GithubMetrics.GithubBase.GithubBase as GithubBase
import datetime
import requests
import time
import csv

class GithubStats(GithubBase.GithubBase):

    def __init__(self, githubId, token,
                 outputFileName=None,
                 solutionEngineersFileName=None,
                 federalRepoFileName=None,
                 commercialRepoFileName=None):

        super().__init__(githubId, token, outputFileName, solutionEngineersFileName,
                         federalRepoFileName, commercialRepoFileName)
        
        self._outputHeader = [
                "GithubId",
                "Email",
                "Name",
                "Title",
                "Repository",
                "Week",
                "Date",
                "Additions",
                "Deletions",
                "Commits"
            ]
        self._createOutputFile(self._outputHeader)
   
    def _runQueryAPI(self, repo):
        retryCount = 0

        while True:
            api = "/repos/" + self._owner + "/" + repo + "/stats/contributors"
            response = requests.get(self._url + api, headers=self._headers)

            logMsg = "[Stats Contributor]Status code for repo(" + repo + "): " + str(response.status_code)
            self._logger.debug(logMsg)

            if self._repeatQuery(response) == True:
                self._logger.info("Repeating query...")
                continue
            elif response.status_code != 200:
                self._logger.info("Status code is not 200, repeating query...")
                continue

            responseJson = response.json()

            row = {}
            for r in responseJson:
                total = r["total"]
                weeks = r["weeks"]
                author = r["author"]["login"].lower()
                for w in weeks:
                    week = w["w"]
                    additions = w["a"]
                    deletions = w["d"]
                    commits = w["c"]
                    if (additions or deletions or commits) and author in self._solutionEngineers.keys():
                        # if (additions or deletions or commits):
                        (email, name, title) = self._solutionEngineers[author]
                        dateFromWeek = f"{datetime.datetime.fromtimestamp( week ):%Y-%m-%d}"
                        row['GithubId'] = author
                        row['Email'] = email
                        row['Name'] = name
                        row['Title'] = title
                        row['Repository'] = repo
                        row['Week'] = week
                        row['Date'] = dateFromWeek
                        row['Additions'] = additions
                        row['Deletions'] = deletions
                        row['Commits'] = commits
                        self._logger.debug(row)
                        self._f.writerow(row)        
            return True
    
    def __del__(self):
        print("GithubStats")
        # self._csvfile.close()
