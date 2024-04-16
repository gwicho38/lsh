import JiraMetrics.JiraBase.JiraBase as JiraBase
import requests
from requests.auth import HTTPBasicAuth
import concurrent.futures
import threading


class JiraTicketComment(JiraBase.JiraBase):

    def __init__(self, jiraId, token, outputFileName=None, solutionEngineersFileName=None):
        super().__init__(jiraId, token, outputFileName, solutionEngineersFileName)
        self._outputHeader = "Author,Email,Title,Project,Ticket,CommentId,createdOn,Count\n"
        self._httpAuth = HTTPBasicAuth(self._jiraId, self._token)
        self._outputHeader = [
                "Author",
                "Email",
                "Title",
                "Project",
                "Ticket",
                "CommentId",
                "createdOn",
                "Count"
        ]

        self._createOutputFile(self._outputHeader)
        self._projectPool = concurrent.futures.ThreadPoolExecutor(max_workers=20)
        self._projectPoolFutures = []
        self._lock = threading.Lock()

    def _getObjects(self, api, params, key):
        objects = []
        startAt = 0
        maxResults = 0
        total = 1  # dummy value for initial iteration
        
        while startAt + maxResults < total:
            prevStart = startAt  # For exception handling and retrying
            startAt = startAt + maxResults
            params['startAt'] = startAt

            try:
                response = requests.get(
                    self._url + api,
                    headers=self._headers,
                    params=params,
                    auth=self._httpAuth,
                    timeout=60
                )
            except Exception as e:
                self._logger.error(e)
                startAt = prevStart
                self._logger.error("Was processing: " + str(startAt))
                continue

            if self._isRateLimit(response) == True:
                startAt = prevStart
                continue

            responseJson = response.json()
            maxResults = responseJson["maxResults"]
            startAt = responseJson["startAt"]
            total = responseJson["total"]
            self._logger.debug(api + " " + str(response.status_code) + " " + str(startAt) +
                  " " + str(maxResults) + " " + str(total))  # Todo: Check status code
            objects.extend(responseJson[key])

        return objects

    def _getElements(self, api, params, key, project=None, ticket=None, f=None):
        elements = []
        objects = self._getObjects(api, params, key)

        for o in objects:
            if f is None:
                elements.append(o['key'])
                self._logger.debug("Element: " + o['key'])
            else:
                displayName = ""
                emailAddress = ""

                if 'displayName' in o['author']:
                    displayName = o['author']['displayName'].lower()
                if 'emailAddress' in o['author']:
                    emailAddress = o['author']['emailAddress'].lower()

                if displayName in self._solutionEngineers or emailAddress in self._solutionEngineers:
                    author = displayName if displayName else emailAddress
                    # TODO: This check may not be needed after data is cleaned.
                    if author in self._solutionEngineers:
                        self._logger.debug(self._solutionEngineers[author][1])
                        authorName = self._solutionEngineers[author][1]
                        emailId = self._solutionEngineers[author][0]
                        title = self._solutionEngineers[author][2]
                        dateCreated = self._stripDate(o['created'])
                        
                        row = {}
                        row['Author'] = authorName
                        row['Email'] = emailId
                        row['Title'] = title
                        row['Project'] = project
                        row['Ticket'] = ticket
                        row['CommentId'] = o['id']
                        row['createdOn'] = dateCreated
                        row['Count'] = 1

                        self._lock.acquire()
                        self._logger.debug(row)
                        self._f.writerow(row)
                        self._lock.release()

        return elements

    def _getProjectList(self):
        api = '/rest/api/3/project/search'
        params = {}
        params['startAt'] = 0
        return self._getElements(api, params, 'values')

    def _getTicketList(self, project):
        api = '/rest/api/3/search'
        params = {}
        params['startAt'] = 0
        # Fetch tickets created in the last 12 months.
        params['jql'] = 'project="' + project + '" and created >= endOfMonth("-13M")'
        return self._getElements(api, params, 'issues')

    def _getCommentMetrics(self, project, ticket, f):
        api = '/rest/api/3/issue/' + ticket + '/comment'
        params = {}
        params['startAt'] = 0
        self._getElements(api, params, 'comments', project, ticket, f)

    def _scrapeProject(self, project):
        tickets = self._getTicketList(project)

        for ticket in tickets:
            self._logger.debug("Project: " + project + ", Ticket: " + ticket)
            self._getCommentMetrics(project, ticket, self._f)

    def _runQuery(self):
        projects = self._getProjectList()

        for project in projects:
            self._projectPoolFutures.append(self._projectPool.submit(self._scrapeProject, project))

    def _readSolutionsEngineers(self):
        super()._readSolutionsEngineers()
        solutionEngrMap = self._solutionEngineers
        self._solutionEngineers = {}
        # The expected format for SolutionEngineers.json file is:
        # {
        #    "githubId": ["emailId", "fullName", "title"],
        #    ...
        # }
        # Create double index on emailId and fullName
        # Because Jira at places uses emailId and at other places fullName.
        for k, v in solutionEngrMap.items():
            self._solutionEngineers[v[0].lower()] = v
            self._solutionEngineers[v[1].lower()] = v

    def __del__(self):
        concurrent.futures.wait(self._projectPoolFutures)
        self._csvfile.close()
        super().__del__()
