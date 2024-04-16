import C3CommunityMetrics.C3CommunityBase.C3CommunityBase as C3CommunityBase
import requests
# from requests.auth import HTTPBasicAuth


class C3CommunityPost(C3CommunityBase.C3CommunityBase):

    def __init__(self, c3CommunityId, token, outputFileName=None, solutionEngineersFileName=None):
        super().__init__(c3CommunityId, token, outputFileName, solutionEngineersFileName)
        self._outputHeader = [
            "GithubId",
            "Email",
            "Name",
            "Title",
            "PostId",
            "Date Created",
            "Category",
            "Views",
            "Replies",
            "Like Count"
            ]

        self._createOutputFile(self._outputHeader)
        self._getCategoryIds()

    def _runQueryAPI(self, se):
        c3CommunityUserId = self._solutionEngineers[se][3]
        self._logger.debug("Fetching posts by: " + c3CommunityUserId)

        page = 0
        params = {}
        
        while True:
            api = '/topics/created-by/' + c3CommunityUserId
            params['page'] = str(page)
            self._logger.debug(self._url + api)

            try:
                response = requests.get(
                    self._url + api,
                    headers=self._headers,
                    params=params
                )
            except Exception as e:
                self._logger.error(e)
                self._logger.error("Was processing: " + str(page))
                continue

            if self._repeatQuery(response):
                self._logger.debug("Hit rate limit, repeating the query")
                continue

            if response.status_code == 404:
                self._logger.debug("User has not made any posts: " + c3CommunityUserId)
                break

            responseJson = response.json()
            # In C3 Community/Discourse the "Posts" are referred as 'Topics'
            posts = responseJson['topic_list']['topics']
            if len(posts) == 0:
                break

            self._logger.debug(api + " " + str(response.status_code) + " " + str(page))

            row = {}
            for post in posts:
                (email, name, title, c3communityid) = self._solutionEngineers[se]
                row['GithubId'] = se
                row['Email'] = email
                row['Name'] = name
                row['Title'] = title
                row['PostId'] = post['id']
                row['Date Created'] = self._stripDate(post['created_at'])
                row['Category'] = self._categoryIds[post['category_id']]
                row['Views'] = post['views']
                row['Replies'] = post['posts_count'] - 1 # Subtract 1 to exclude the post itself.
                row['Like Count'] = post['like_count']
                self._logger.debug(row)
                self._f.writerow(row)

            exit
            page += 1

        return

    def _runQuery(self):
        # For each solution engineer, run the query
        for se in self._solutionEngineers:
            self._runQueryAPI(se)

        return

    def __del__(self):
        self._csvfile.close()
