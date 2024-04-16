import C3CommunityMetrics.C3CommunityBase.C3CommunityBase as C3CommunityBase
import requests
# from requests.auth import HTTPBasicAuth


class C3CommunityReply(C3CommunityBase.C3CommunityBase):

    def __init__(self, c3CommunityId, token, outputFileName=None, solutionEngineersFileName=None):
        super().__init__(c3CommunityId, token, outputFileName, solutionEngineersFileName)
        # self._headers['Api-Key'] = self._token
        self._outputHeader = [
            "GithubId",
            "Email",
            "Name",
            "Title",
            "PostId",
            "ReplyId",
            "Date Created",
            "Category",
            "Solution"
            ]

        self._createOutputFile(self._outputHeader)

    def _runQueryAPI(self, se):
        c3CommunityUserId = self._solutionEngineers[se][3]
        self._logger.debug("Fetching replies for: " + c3CommunityUserId)

        offset = 0
        params = {}
        
        while True:
            api = '/user_actions.json'
            params['offset'] = str(offset)
            params['username'] = c3CommunityUserId
            params['filter'] = str(5) # 5 is for replies, 4 is for posts
            self._logger.debug(self._url + api)

            try:
                response = requests.get(
                    self._url + api,
                    headers=self._headers,
                    params=params
                )
            except Exception as e:
                self._logger.error(e)
                self._logger.error("Was processing: " + str(offset))
                continue

            if self._repeatQuery(response):
                self._logger.debug("Hit rate limit, repeating the query")
                continue

            if response.status_code == 404:
                self._logger.debug("User has not made any posts: " + c3CommunityUserId)
                break

            if response.status_code != 200:
                self._logger.debug("Rerunning because of HTML Response: " + str(response.status_code))
                break

            responseJson = response.json()
            # In C3 Community/Discourse the "Posts" are referred as 'Topics'
            # and "Replies" as "Posts"
            replies = responseJson['user_actions']
            if len(replies) == 0:
                break

            self._logger.debug(api + " " + str(response.status_code) + " " + str(offset))

            row = {}
            for reply in replies:
                (email, name, title, c3communityid) = self._solutionEngineers[se]
                row['GithubId'] = se
                row['Email'] = email
                row['Name'] = name
                row['Title'] = title
                row['PostId'] = reply['topic_id']
                row['ReplyId'] = reply['post_number']
                row['Date Created'] = self._stripDate(reply['created_at'])
                row['Category'] = self._categoryIds[reply['category_id']]
                row['Solution'] = self._isSolution(str(reply['post_id']))
                self._logger.debug(row)
                self._f.writerow(row)

            exit
            offset += len(replies)

        return

    def _isSolution(self, postId):
        self._logger.debug("Posts ID: " + postId)
        isSolution = 0
        
        while True:
            api = '/posts/' + postId + '.json'
            self._logger.debug(self._url + api)

            try:
                response = requests.get(
                    self._url + api,
                    headers=self._headers)

            except Exception as e:
                self._logger.error(e)
                self._logger.error("Was processing: " + postId)
                continue

            if self._repeatQuery(response):
                self._logger.debug("Hit rate limit, repeating the query")
                continue
            
            if response.status_code == 404:
                self._logger.debug("This is a topic, not a post: " + postId)
                break

            if response.status_code != 200:
                self._logger.debug("Rerunning because of HTML Response: " + str(response.status_code))
                break

            responseJson = response.json()
            isSolution = 1 if responseJson['accepted_answer'] else 0
            break

        return isSolution

    def _runQuery(self):
        # For each solution engineer, run the query
        for se in self._solutionEngineers:
            self._runQueryAPI(se)

        return

    def __del__(self):
        self._csvfile.close()
