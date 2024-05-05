import { Octokit } from "@octokit/rest";

// Initialize Octokit with the authentication token
export const createOctokit = (authToken: string) => new Octokit({
    auth: authToken
});

// Function to search pull requests by a specific user
export async function cmd_search_prs(octokit: Octokit, user: string, repo: string, organization?: string) {
    const q = `type:pr author:${user} repo:${organization ? `${organization}/` : ''}${repo}`;
    const response = await octokit.search.issuesAndPullRequests({ q });
    return response.data;
}

// Function to search PR reviews by a specific user
export async function cmd_search_reviews(octokit: Octokit, user: string, repo: string, organization?: string) {
    const prs = await cmd_search_prs(octokit, user, repo, organization);
    const reviewsPromises = prs.items.map(pr => 
        octokit.pulls.listReviews({
            owner: organization || user,
            repo,
            pull_number: pr.number,
        })
    );
    return Promise.all(reviewsPromises);
}