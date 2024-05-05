import GithubMetrics.GithubBase.GithubBase as GithubBase
import requests
import datetime
import csv
import os.path

class GithubPR(GithubBase.GithubBase):

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
                "Created",
                "Closed",
                "PullNumber",
                "Count",
                "Comments",
                "Reviews",
                "pyDoc",
                "jsonDoc",
                "jsDoc",
                "mdDoc",
                "c3typDoc",
                "jsxDoc",
                "c3docDoc",
                "tsDoc",
                "tsxDoc",
                "csvDoc",
                "jpgDoc",
                "svgDoc",
                "otherDoc"
            ]
        self._readPullsLastRecorded()
        self._readPullsProcessed()
        self._reconcilePullNumbers()
        self._createOutputFile(self._outputHeader)

    # Function to determine the page number and the pull number based on the last run of the script.
    # There are 3 cases to handle:
    #   1. New repo is added to query list.
    #   2. If the .csv file doesn't exist, we need to start from scratch 
    #   3. The pulls in .csv file > .json file (The script was killed/crashed before writing to .json)
    #   
    #  If the pulls in .json file > .csv file, don't need to worry. (Happy path)
    def _reconcilePullNumbers(self):
        if not self._pullsLastRecorded: # The .csv file is empty, the script was never run. Start from scratch
            self._logger.debug("No results are cached, starting from scratch: " + self._outputFileName)
            for repo in self._commercialRepoList + self._federalRepoList:
                self._pullsProcessed[repo] = {
                    'page': 1,
                    'pullNumber': 0,
                    'openPR': []
                }
        else: # The script was run at some point. If the repo doesn't exist in .json file means a new repo. 
            # TODO: [CSOL-2503] Compute the page# based on the pull# 
            # More details in the above ticket.
            for repo in self._commercialRepoList + self._federalRepoList:
                if repo not in self._pullsProcessed.keys():
                    self._logger.debug("New repo: " + repo)
                    self._pullsProcessed[repo] = {
                        'page': 1,
                        'pullNumber': 0,
                        'openPR': []
                    }

        # Determine the pull# to resume from each repo.
        for repo in self._pullsLastRecorded.keys():
            self._pullsProcessed[repo]['pullNumber'] = max(self._pullsProcessed[repo]['pullNumber'],
                                                        self._pullsLastRecorded[repo])

    def _getPRReviewCommentDocumentCount(self, repo, pullNumber, pathParam):
        params = {}
        count = 0
        pageCount = 0
        documentTypeCount = {
            "py": 0,
            "json": 0,
            "js": 0,
            "md": 0,
            "c3typ": 0,
            "jsx": 0,
            "c3doc": 0,
            "ts": 0,
            "tsx": 0,
            "csv": 0,
            "jpg": 0,
            "svg": 0,
            "other": 0
        }
        params['per_page'] = '100'

        while True:
            self._apiCount += 1
            api = "/repos/" + self._owner + "/" + repo + "/pulls/" + str(pullNumber) + "/" + pathParam
            prevPageCount = pageCount
            pageCount += 1

            params['page'] = str(pageCount)

            try:
                # Set the timeout to 10secs for now.
                response = requests.get(self._url + api, headers=self._headers, params=params, timeout=30)
            except Exception as e:
                self._logger.error("[PR]" + "repo(" + repo + "), page("+ str(pageCount) + ")" + ", pathParam(" + pathParam + ")")
                self._logger.error(e)
                pageCount = prevPageCount
                continue

            logMsg = "[PR]" + "repo(" + repo + "), " + "status(" + str(response.status_code) + \
                     "), page("+ str(pageCount) + ")" + ", pathParam(" + pathParam + ")" 

            self._logger.debug(logMsg)

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
            
            if pathParam == "files": # Continue to extract the file type and keep count 
                for r in responseJson:
                    filename = r["filename"]
                    filetype = filename[filename.rfind(".")+1:]
                    if filetype in documentTypeCount:
                        documentTypeCount[filetype] += 1
                    else:
                        documentTypeCount["other"] += 1
                
                self._logger.debug(documentTypeCount)
            else:
                count += len(responseJson) 
        
        return count, documentTypeCount

    # Returns True if the processing was successful, False if the PR is open
    def _processPR(self, repo, pr):
        row = {}
        prDocuments = {}

        author = pr["user"]["login"].lower()
        pullNumber = str(pr['number'])

        createdAt = self._stripDate(pr["created_at"])
        closedAt = self._stripDate(pr["closed_at"])
        mergedAt = self._stripDate(pr["merged_at"])

        self._logger.debug("closedAt: " + closedAt + ", mergedAt: " + mergedAt)
        if not closedAt and not mergedAt:
            self._logger.debug("PR is open: " + pullNumber)
            # self._pullsProcessed[repo]['openPR'].append(int(pullNumber))
            return False
        elif closedAt and not mergedAt:
            self._logger.debug("PR is Closed: " + pullNumber)
        else:
            # PR is merged

            prReviews, _ = self._getPRReviewCommentDocumentCount(repo, pullNumber, "reviews")
            prReviews = str(prReviews)

            prComments, _ = self._getPRReviewCommentDocumentCount(repo, pullNumber, "comments")
            prComments = str(prComments)
            
            _, prDocuments = self._getPRReviewCommentDocumentCount(repo, pullNumber, "files")

            (email, name, title) = self._solutionEngineers[author]
            row['GithubId'] = author
            row['Repository'] = repo
            row['Created'] = createdAt
            row['Closed'] = closedAt
            row['PullNumber'] = pullNumber
            row['Reviews'] = prReviews
            row['Comments'] = prComments
            row['pyDoc'] = prDocuments["py"]
            row['jsonDoc'] = prDocuments["json"]
            row['jsDoc'] = prDocuments["js"]
            row['mdDoc'] = prDocuments["md"]
            row['c3typDoc'] = prDocuments["c3typ"]
            row['jsxDoc'] = prDocuments["jsx"]
            row['c3docDoc'] = prDocuments["c3doc"]
            row['tsDoc'] = prDocuments["ts"]
            row['tsxDoc'] = prDocuments["tsx"]
            row['csvDoc'] = prDocuments["csv"]
            row['jpgDoc'] = prDocuments["jpg"]
            row['svgDoc'] = prDocuments["svg"]
            row['otherDoc'] = prDocuments["other"]
            row['Email'] = email
            row['Name'] = name
            row['Title'] = title
            row['Count'] = 1
            self._logger.debug(row)
            self._f.writerow(row)
        
        return True

    def _processOpenPR(self, repo):

        itemCount = len(self._pullsProcessed[repo]['openPR'])

        for i in range(itemCount):
            pr = self._pullsProcessed[repo]['openPR'].pop(0) # Remove item from the front.
            while True:
                api = "/repos/" + self._owner + "/" + repo + "/pulls/" + str(pr) 

                try:
                    # Set the timeout to 30secs for now.
                    response = requests.get(self._url + api, headers=self._headers, timeout=30)
                except Exception as e:
                    self._logger.error("[PR]" + "repo(" + repo + "), " + "status(" + str(response.status_code) + ")")
                    self._logger.error(e)
                    continue

                logMsg = ("[PR]" + "repo(" + repo + "), " + "status(" + str(response.status_code) + ")")
                self._logger.debug(logMsg)

                if self._repeatQuery(response) == True:
                    self._logger.info("Repeating query...")
                    continue
                elif response.status_code != 200:
                    self._logger.info("Status code is not 200, repeating query...")
                    continue

                responseJson = response.json()
                if self._processPR(repo, responseJson) == False:
                    self._pullsProcessed[repo]['openPR'].append(pr)
                break

    def _runQueryAPI(self, repo):

        self._processOpenPR(repo)
        pageCount = self._pullsProcessed[repo]['page']
        params = {
            'state': 'all',
            'direction': 'asc'
        }
        params['per_page'] = '100' # Max results per page is 100

        while True:
            self._apiCount += 1
            api = "/repos/" + self._owner + "/" + repo + "/pulls"
            params['page'] = str(pageCount)

            try:
                # Set the timeout to 30secs for now.
                response = requests.get(self._url + api, headers=self._headers, params=params, timeout=30)
            except Exception as e:
                self._logger.error("[PR]" + "repo(" + repo + "), " + "status(" + str(response.status_code) + \
                     "), page("+ str(pageCount) + ")")
                self._logger.error(e)
                continue

            logMsg = ("[PR]" + "repo(" + repo + "), " + "status(" + str(response.status_code) + \
                     "), page("+ str(pageCount) + ")")
            self._logger.debug(logMsg)

            if self._repeatQuery(response) == True:
                self._logger.info("Repeating query...")
                continue
            elif response.status_code != 200:
                self._logger.info("Status code is not 200, repeating query...")
                continue

            responseJson = response.json()

            if len(responseJson) == 0:
                self._writePullsProcessed()
                break

            for pr in responseJson:
                author = pr["user"]["login"].lower()
                pullNumber = str(pr['number'])

                if pr['number'] <= self._pullsProcessed[repo]['pullNumber']:
                    self._logger.debug("Pull Number already processed: " + pullNumber)
                    continue
                if author in self._solutionEngineers:
                    if self._processPR(repo, pr) == False:
                        self._pullsProcessed[repo]['openPR'].append(int(pullNumber))

                # Write to file after processing every pull.
                # This will avoid re-querying the same pull.
                self._pullsProcessed[repo]['page'] = pageCount
                self._pullsProcessed[repo]['pullNumber'] = int(pullNumber) 
                self._writePullsProcessed()
            
            pageCount += 1

        return True

    def _readPullsLastRecorded(self):
        try:
            file = open(self._outputDir + self._outputFileName, 'r')
            csvFile = csv.DictReader(file)
            for line in csvFile:
                repo = line['Repository']
                pullNumber = int(line['PullNumber'])
                if repo in self._pullsLastRecorded.keys():
                    self._pullsLastRecorded[repo] = max(self._pullsLastRecorded[repo], pullNumber)
                else:
                    self._pullsLastRecorded[repo] = pullNumber
            file.close()
        except Exception as e:
            self._logger.error("File does not exist: " + self._outputFileName)

    # TODO: [CSOL-2504] Remove _createOutputFile() from GithubPR.py file 
    def _createOutputFile(self, header):
        filePath = self._outputDir + self._outputFileName
        fileExists = os.path.exists(filePath)
        self._csvfile = open(filePath, "a")
        self._f = csv.DictWriter(self._csvfile, fieldnames=header)
        if not fileExists: # File did not exist, need to write the header.
            self._f.writeheader()

    def __del__(self):
        self._csvfile.close()
