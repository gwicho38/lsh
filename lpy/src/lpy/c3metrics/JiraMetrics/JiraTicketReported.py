import JiraMetrics.JiraBase.JiraBase as JiraBase
import requests
from requests.auth import HTTPBasicAuth

class JiraTicketReported(JiraBase.JiraBase):

    def __init__(self, jiraId, token, outputFileName=None, solutionEngineersFileName=None):
        super().__init__(jiraId, token, outputFileName, solutionEngineersFileName)
        self._httpAuth = HTTPBasicAuth(self._jiraId, self._token)
        self._outputHeader = [
                "Assignee",
                "Reporter Id",
                "Reporter",
                "Project",
                "Ticket",
                "Created",
                "Resolved",
                "Status",
                "Summary",
                "Email",
                "Title",
                "Count"
        ]
        self._createOutputFile(self._outputHeader)

    def _runQueryAPI(self, id):
        # engineer = solutionEngineers[id][1]
        engineer = self._solutionEngineers[id][0].lower()  # by email

        self._logger.debug(engineer)
        query = {
            'jql': "reporter='" + engineer + "'"
        }

        startAt = 0
        maxResults = 0
        total = 1  # dummy value for initial iteration

        while startAt + maxResults < total:

            prevStartAt = startAt
            startAt = startAt + maxResults

            query['startAt'] = startAt

            try:
                response = requests.get(
                self._url + '/rest/api/3/search',
                headers=self._headers,
                params=query,
                auth=self._httpAuth
                )
            except Exception as e:
                self._logger.error(e)
                startAt = prevStartAt
                continue

            if self._isRateLimit(response) == True:
                startAt = prevStartAt
                continue

            responseJson = response.json()
            # self._logger.debug(json.dumps(json.loads(response.text), sort_keys=True, indent=4, separators=(",", ": ")))

            # Will hit this condition when query doesn't 
            # succeed with 'emailId'/'Full Name'.
            # In the first attempt run the query with emailId.
            # If it fails, then attempt to run the query with 'Full Name'
            if 'warningMessages' in responseJson:
                self._logger.error("Query failed with: " + engineer)
                # Skip engineer after trying with email and 'Full Name' 
                if engineer == self._solutionEngineers[id][1].lower():
                    self._logger.debug("Query failed after trying with 'emailId' and 'Full Name': (" + \
                        self._solutionEngineers[id][0].lower() + ', ' + \
                        self._solutionEngineers[id][1].lower() + '), skipping...')
                    break
                engineer = self._solutionEngineers[id][1].lower()  # by Full Name
                startAt = prevStartAt
                query['jql'] = "reporter='" + engineer + "'"
                continue

            issues = responseJson["issues"]
            maxResults = responseJson["maxResults"]
            startAt = responseJson["startAt"]
            total = responseJson["total"]
            
            # TODO: [CSOL-2752] Check HTTP status code. 
            self._logger.debug(engineer + " " + str(response.status_code) + " " + str(startAt) +
                " " + str(maxResults) + " " + str(total))

            for issue in issues:
                # issue = issues[1]
                def getId(role):
                    if issue['fields'][role] is None:
                        return ""
                    
                    if "emailAddress" in issue["fields"][role]:
                        id = issue["fields"][role]["emailAddress"]
                    else:
                        id = issue["fields"][role]["displayName"]

                    return id

                row = {}
                row['Assignee'] = getId("assignee")
                row['Reporter Id'] = getId("reporter")
                row['Reporter'] = self._solutionEngineers[id][1]
                row['Project'] = issue["fields"]["project"]["name"]
                row['Ticket'] = issue["key"]
                row['Created'] = self._stripDate(issue["fields"]["created"])
                row['Resolved'] = self._stripDate(issue["fields"]["resolutiondate"]) \
                                                    if issue["fields"]["resolutiondate"] else ""
                row['Status'] = issue["fields"]["status"]["name"]
                row['Summary'] = issue["fields"]["summary"].strip()
                row['Email'] = self._solutionEngineers[id][0]
                row['Title'] = self._solutionEngineers[id][2]
                row['Count'] = 1
                self._logger.debug(row)
                self._f.writerow(row)

    def __del__(self):
        self._csvfile.close()
        super().__del__()
