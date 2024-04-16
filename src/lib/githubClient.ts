import axios from 'axios';

class GitHubClient {
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: 'https://api.github.com/',
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
    }

    async getRepositories(username) {
        try {
            const response = await this.axiosInstance.get(`users/${username}/repos`);
            return response.data;
        } catch (error) {
            console.error('Error fetching repositories:', error);
            throw error;
        }
    }

    async getRepositoryIssues(owner, repo) {
        try {
            const response = await this.axiosInstance.get(`repos/${owner}/${repo}/issues`);
            return response.data;
        } catch (error) {
            console.error('Error fetching repository issues:', error);
            throw error;
        }
    }

    async getUserProfile(username) {
        try {
            const response = await this.axiosInstance.get(`users/${username}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }
}

export { GitHubClient };
