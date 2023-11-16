# C3 API Call

https://gkev8dev.c3dev.cloud/c3/studio/api/8/CloudClusterUtil/startEnv

curl 'https://gkev8dev.c3dev.cloud/c3/studio/api/8/CloudClusterUtil/startEnv' --compressed -X POST -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0' -H 'Accept: application/json' -H 'Accept-Language: en-US,en;q=0.5' -H 'Accept-Encoding: gzip, deflate, br' -H 'Content-type: application/json' -H 'X-C3-Language: en' -H 'Origin: https://gkev8dev.c3dev.cloud' -H 'Connection: keep-alive' -H 'Referer: https://gkev8dev.c3dev.cloud/c3/studio/home' -H 'Cookie: c3auth=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGRldi1jMy1zdHVkaW8iLCJpc3MiOiJjMy5haSIsImdyb3VwcyI6WyJDMy5TdHVkaW9Vc2VyIl0sInNpZCI6MSwiYXVkIjoiYzMuYWkiLCJpZHAiOiIiLCJjM2dyb3VwcyI6W10sImlkcGdyb3VwcyI6IntcIk9pZGNJZHBDb25maWc6OmdrZXY4ZGV2LmMzZGV2LmNsb3VkXCI6W1wiZGV2Lk9pZGNEZWZhdWx0R3JvdXBcIl19Iiwic3NpZHgiOiIiLCJuYW1lIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImlkIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImV4cCI6MTY5NjcwMjM5MTAwMCwiZW1haWwiOiJsdWlzLmZlcm5hbmRlei1kZS1sYS12YXJhQGMzLmFpIn0.I_hKXBqRpPl7Zje75rRR-Ef7EMpu9gEy8_kEKoxrLw3Ofd-N-GUsGPtsEoH3Zgr4iF0PmORdxr8GPy8ga-HNUzNEstOQ7WBKQu-Hs_ksb1poU2pKHqK7AJfNMsNHpK7q9H0cPbR2E6V8QxmnCJ0vCJYeSgfsNTBlUMO4IpZHxnJTryM-vkKRI6Ed083oR0yHYpHo91XqfsoMpJCCZNTTZlj1kkmGt_cXvkhXXSuMAr_2POVI1S_IXOuDogFkj7XQsJ5yBM9O7mgLYVC2zxH2Y07cZeGSMEWeI2Yr0ULURZGjw3KjXd0HQt6hhOoFOSnxMW2v75Kwn7aIxk3V2rVGNA; c3csrf=SFMyNTYmZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SmhkV1FpT2lKak15NWhhU0lzSW1OeWRDSTZNVFk1TmpZeE5qVXhNREF3TUN3aWFYTnpJam9pWXpNdVlXa2lMQ0poZEhSeUlqb2llMXdpWlhod1hDSTZNakF4TWpJek5UY3hNREF3TUN4Y0ltbGtYQ0k2WENKbVl6Z3dOREV6WWpFNU5qVmlNREZoWWpNeFpqRXpNVE15WVdNeE9UWXlPR1EyTkRBM05HRTJOVEkyTkRKbE1tTTRaREJpTVRnd1lUVTFabU5sWXpsbVhDSXNYQ0poY0hCY0lqcGNJbWRyWlhZNFpHVjJMV016TFhOMGRXUnBiMXdpTEZ3aWMybGtYQ0k2TVgwaUxDSmxlSEFpT2pJd01USXlNelUzTVRBd01EQXNJblJyYVc1a0lqb2lRM055WmxSdmEyVnVJbjAuVGRXc1dsOEdRQTdQeTl5RjM5aHBsSnVfdW1KNl9uNUZiMzZVX2dPY0Fjcw%3D%3D; c3env=c3; c3app=studio; c3AppUrlPrefix=c3/studio; env-app-name=lefv-gurusearch' -H 'Sec-Fetch-Dest: empty' -H 'Sec-Fetch-Mode: cors' -H 'Sec-Fetch-Site: same-origin' -H 'TE: trailers' --data-raw '{"spec":{"name":"main","singleNode":true}}'


const result = await fetch("https://gkev8dev.c3dev.cloud/c3/studio/api/8/CloudClusterUtil/startEnv", {
    "credentials": "include",
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-type": "application/json",
        "X-C3-Language": "en",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
    },
    "referrer": "https://gkev8dev.c3dev.cloud/c3/studio/home",
    "body": "{\"spec\":{\"name\":\"main\",\"singleNode\":true}}",
    "method": "POST",
    "mode": "cors"
});

https://stackoverflow.com/questions/67897358/compile-nodejs-to-binary

https://github.com/nexe/nexe

