from GithubMetrics.GithubStats import GithubStats
from GithubMetrics.GithubPR import GithubPR
from GithubMetrics.GithubPRComments import GithubPRComments
from JiraMetrics.JiraTicketAssignment import JiraTicketAssignment
from JiraMetrics.JiraTicketReported import JiraTicketReported
from JiraMetrics.JiraTicketComment import JiraTicketComment
from C3CommunityMetrics.C3CommunityPost import C3CommunityPost
from C3CommunityMetrics.C3CommunityReply import C3CommunityReply
from utility.Logging import Logging

Logger=Logging()

GITHUB_USERNAME = 'your_githubId' # 'c3-yourGithubId'
GITHUB_TOKEN = 'your_githubToken'

JIRA_USERNAME = 'your_jiraId' # '<emailId>@c3.ai'
JIRA_TOKEN = 'your_jiraToken'

C3COMMUNITY_USERNAME = '' # Username is not required
C3COMMUNITY_TOKEN = '' # C3 Community token

githubStats = GithubStats(GITHUB_USERNAME, GITHUB_TOKEN, 'github_stats_contributor.csv')
githubStats.runGithubQuery()
del githubStats

githubPR = GithubPR(GITHUB_USERNAME, GITHUB_TOKEN, 'github_pull_requests.csv')
githubPR.runGithubQuery()
del githubPR

githubPRComments = GithubPRComments(GITHUB_USERNAME, GITHUB_TOKEN, 'github_pull_requests_comments.csv')
githubPRComments.runGithubQuery()
del githubPRComments

jiraTicketAssignment = JiraTicketAssignment(JIRA_USERNAME, JIRA_TOKEN, 'jira_ticket_stats.csv')
jiraTicketAssignment.runJiraQuery()
del jiraTicketAssignment

jiraTicketReported = JiraTicketReported(JIRA_USERNAME, JIRA_TOKEN, 'jira_reported_stats.csv')
jiraTicketReported.runJiraQuery()
del jiraTicketReported

jiraTicketComment = JiraTicketComment(JIRA_USERNAME, JIRA_TOKEN, 'jira_comment_stats.csv')
jiraTicketComment.runJiraQuery()
del jiraTicketComment

c3CommunityPost = C3CommunityPost(C3COMMUNITY_USERNAME, C3COMMUNITY_TOKEN, 'c3community_posts.csv')
c3CommunityPost.runC3CommunityQuery()
del c3CommunityPost

c3CommunityReply = C3CommunityReply(C3COMMUNITY_USERNAME, C3COMMUNITY_TOKEN, 'c3community_replies.csv')
c3CommunityReply.runC3CommunityQuery()
del c3CommunityReply
