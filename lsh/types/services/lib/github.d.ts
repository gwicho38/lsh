import { Octokit } from "@octokit/rest";
export declare const createOctokit: (authToken: string) => import("@octokit/core").Octokit & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
} & import("@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types").RestEndpointMethods & import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api;
export declare function cmd_search_prs(octokit: Octokit, user: string, repo: string, organization?: string): Promise<{
    total_count: number;
    incomplete_results: boolean;
    items: {
        url: string;
        repository_url: string;
        labels_url: string;
        comments_url: string;
        events_url: string;
        html_url: string;
        id: number;
        node_id: string;
        number: number;
        title: string;
        locked: boolean;
        active_lock_reason?: string;
        assignees?: {
            name?: string;
            email?: string;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        }[];
        user: {
            name?: string;
            email?: string;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        };
        labels: {
            id?: number;
            node_id?: string;
            url?: string;
            name?: string;
            color?: string;
            default?: boolean;
            description?: string;
        }[];
        state: string;
        state_reason?: string;
        assignee: {
            name?: string;
            email?: string;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        };
        milestone: {
            url: string;
            html_url: string;
            labels_url: string;
            id: number;
            node_id: string;
            number: number;
            state: "closed" | "open";
            title: string;
            description: string;
            creator: {
                name?: string;
                email?: string;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string;
            };
            open_issues: number;
            closed_issues: number;
            created_at: string;
            updated_at: string;
            closed_at: string;
            due_on: string;
        };
        comments: number;
        created_at: string;
        updated_at: string;
        closed_at: string;
        text_matches?: {
            object_url?: string;
            object_type?: string;
            property?: string;
            fragment?: string;
            matches?: {
                text?: string;
                indices?: number[];
            }[];
        }[];
        pull_request?: {
            merged_at?: string;
            diff_url: string;
            html_url: string;
            patch_url: string;
            url: string;
        };
        body?: string;
        score: number;
        author_association: "COLLABORATOR" | "CONTRIBUTOR" | "FIRST_TIMER" | "FIRST_TIME_CONTRIBUTOR" | "MANNEQUIN" | "MEMBER" | "NONE" | "OWNER";
        draft?: boolean;
        repository?: {
            id: number;
            node_id: string;
            name: string;
            full_name: string;
            license: {
                key: string;
                name: string;
                url: string;
                spdx_id: string;
                node_id: string;
                html_url?: string;
            };
            forks: number;
            permissions?: {
                admin: boolean;
                pull: boolean;
                triage?: boolean;
                push: boolean;
                maintain?: boolean;
            };
            owner: {
                name?: string;
                email?: string;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string;
            };
            private: boolean;
            html_url: string;
            description: string;
            fork: boolean;
            url: string;
            archive_url: string;
            assignees_url: string;
            blobs_url: string;
            branches_url: string;
            collaborators_url: string;
            comments_url: string;
            commits_url: string;
            compare_url: string;
            contents_url: string;
            contributors_url: string;
            deployments_url: string;
            downloads_url: string;
            events_url: string;
            forks_url: string;
            git_commits_url: string;
            git_refs_url: string;
            git_tags_url: string;
            git_url: string;
            issue_comment_url: string;
            issue_events_url: string;
            issues_url: string;
            keys_url: string;
            labels_url: string;
            languages_url: string;
            merges_url: string;
            milestones_url: string;
            notifications_url: string;
            pulls_url: string;
            releases_url: string;
            ssh_url: string;
            stargazers_url: string;
            statuses_url: string;
            subscribers_url: string;
            subscription_url: string;
            tags_url: string;
            teams_url: string;
            trees_url: string;
            clone_url: string;
            mirror_url: string;
            hooks_url: string;
            svn_url: string;
            homepage: string;
            language: string;
            forks_count: number;
            stargazers_count: number;
            watchers_count: number;
            size: number;
            default_branch: string;
            open_issues_count: number;
            is_template?: boolean;
            topics?: string[];
            has_issues: boolean;
            has_projects: boolean;
            has_wiki: boolean;
            has_pages: boolean;
            has_downloads: boolean;
            has_discussions?: boolean;
            archived: boolean;
            disabled: boolean;
            visibility?: string;
            pushed_at: string;
            created_at: string;
            updated_at: string;
            allow_rebase_merge?: boolean;
            temp_clone_token?: string;
            allow_squash_merge?: boolean;
            allow_auto_merge?: boolean;
            delete_branch_on_merge?: boolean;
            allow_update_branch?: boolean;
            use_squash_pr_title_as_default?: boolean;
            squash_merge_commit_title?: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
            squash_merge_commit_message?: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
            merge_commit_title?: "PR_TITLE" | "MERGE_MESSAGE";
            merge_commit_message?: "PR_TITLE" | "PR_BODY" | "BLANK";
            allow_merge_commit?: boolean;
            allow_forking?: boolean;
            web_commit_signoff_required?: boolean;
            open_issues: number;
            watchers: number;
            master_branch?: string;
            starred_at?: string;
            anonymous_access_enabled?: boolean;
        };
        body_html?: string;
        body_text?: string;
        timeline_url?: string;
        performed_via_github_app?: {
            id: number;
            slug?: string;
            node_id: string;
            owner: {
                name?: string;
                email?: string;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string;
            };
            name: string;
            description: string;
            external_url: string;
            html_url: string;
            created_at: string;
            updated_at: string;
            permissions: {
                [key: string]: string;
                issues?: string;
                checks?: string;
                metadata?: string;
                contents?: string;
                deployments?: string;
            };
            events: string[];
            installations_count?: number;
            client_id?: string;
            client_secret?: string;
            webhook_secret?: string;
            pem?: string;
        };
        reactions?: {
            url: string;
            total_count: number;
            "+1": number;
            "-1": number;
            laugh: number;
            confused: number;
            heart: number;
            hooray: number;
            eyes: number;
            rocket: number;
        };
    }[];
}>;
export declare function cmd_search_reviews(octokit: Octokit, user: string, repo: string, organization?: string): Promise<import("@octokit/plugin-paginate-rest/dist-types/types").OctokitResponse<{
    id: number;
    node_id: string;
    user: {
        name?: string;
        email?: string;
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
        starred_at?: string;
    };
    body: string;
    state: string;
    html_url: string;
    pull_request_url: string;
    _links: {
        html: {
            href: string;
        };
        pull_request: {
            href: string;
        };
    };
    submitted_at?: string;
    commit_id: string;
    body_html?: string;
    body_text?: string;
    author_association: "COLLABORATOR" | "CONTRIBUTOR" | "FIRST_TIMER" | "FIRST_TIME_CONTRIBUTOR" | "MANNEQUIN" | "MEMBER" | "NONE" | "OWNER";
}[], 200>[]>;
