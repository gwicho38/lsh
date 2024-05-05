import GithubMetrics.GithubBase.GithubBase as GithubBase
import requests
import datetime

class GithubPRComments(GithubBase.GithubBase):

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
                "ReviewId",
                "Created",
                "Updated",
                "Count"
            ]
        self._readPullsProcessed()
        self._createOutputFile(self._outputHeader)
    
    def _runQueryAPI(self, repo):        
        pageCount = 0
        oneYearAgo = datetime.datetime.now() - datetime.timedelta(days=365)

        params = {
            # Fetch review comments starting from one year back
            'since' : oneYearAgo.strftime("%Y-%m-%dT%H:%M:%SZ"),
            'sort' : 'created',
            'direction' : 'asc',
            'per_page' : '100'
        }

        while True:
            api = "/repos/" + self._owner + "/" + repo + "/pulls/comments"
            prevPageCount = pageCount
            pageCount += 1 
            params['page'] = str(pageCount)

            try:
                # Set the timeout to 10secs for now.
                response = requests.get(self._url + api, headers=self._headers, params=params, timeout=30)
                self._repeatQuery(response)
            except Exception as e:
                self._logger.error("Was processing pageCount: ", str(pageCount))
                self._logger.error(e)
                pageCount = prevPageCount
                continue

            logMsg = "[PR-Comments]" + "repo(" + repo + "), " + "status(" + str(response.status_code) + \
                     "), page("+ str(pageCount) + ")" 
            self._logger.debug(logMsg + " fetching...")

            if self._repeatQuery(response) == True:
                self._logger.info("Repeating query...")
                pageCount = prevPageCount
                continue
            elif response.status_code != 200:
                self._logger.info("Status code is not 200, repeating query...")
                pageCount = prevPageCount
                continue

            responseJson = response.json()

            if len(responseJson) == 0:
                break

            row = {}
            for r in responseJson:
                if r is None or r["user"] is None:
                    self._logger.error("Something went wrong...for repo: " + repo)
                    continue ## Sanity check, crashed a couple of times

                self._logger.debug(r["user"]["login"] + "," + r["created_at"] + "," + r["updated_at"])
                author = r["user"]["login"].lower()
                reviewId = str(r["id"])
                createdAt = self._stripDate(r["created_at"])
                updatedAt = self._stripDate(r["updated_at"])
                if author in self._solutionEngineers:
                    (email, name, title) = self._solutionEngineers[author]
                    row['GithubId'] = author
                    row['ReviewId'] = reviewId
                    row['Repository'] = repo
                    row['Created'] = createdAt
                    row['Updated'] = updatedAt
                    row['Email'] = email
                    row['Name'] = name
                    row['Title'] = title
                    row['Count'] = 1
                    self._logger.debug(row)
                    self._f.writerow(row)

                self._pullsProcessed[repo] = {
                    'page': pageCount,
                    'reviewId': int(reviewId) 
                }
                self._writePullsProcessed()

        return True
    
    def __del__(self):
        self._csvfile.close()
