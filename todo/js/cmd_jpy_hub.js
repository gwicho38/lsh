function inst_jpy_hub() {
    fetch("http://localhost:50864/lefv202310092005/gurusearchui/api/8/JupyterHub/inst", {
  "headers": {
    "accept": "application/json",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGRldi1sZWZ2MjAyMzEwMDkyMDA1LWMzIiwiaXNzIjoiYzMuYWkiLCJncm91cHMiOlsiQzMuRW52QWRtaW4iXSwic2lkIjoxLCJhdWQiOiJjMy5haSIsImlkcCI6IiIsImMzZ3JvdXBzIjpbIkMzLkVudkFkbWluIl0sImlkcGdyb3VwcyI6IntcIk9pZGNJZHBDb25maWc6OmdrZXY4ZGV2LmMzZGV2LmNsb3VkXCI6W1wiZGV2Lk9pZGNEZWZhdWx0R3JvdXBcIl19Iiwic3NpZHgiOiIiLCJuYW1lIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImlkIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImV4cCI6MTY5OTk3NzExMzAwMCwiZW1haWwiOiJsdWlzLmZlcm5hbmRlei1kZS1sYS12YXJhQGMzLmFpIn0.p5ENcNewKGQjGr83LXPkJadoNzUzl5-ajd2ZqSPBFF8QeHVO4S8vNIsGIeAm1tCD7S_0y2RxlEpzSwYv9Ppb37Wqvg-0HkScibODwbiZzXbtpPZnywT9inyO1BRQjPgtq-qlAAiPoQCkW-klMJDzOcCNQGL04Zco2Haz0xNnqtoWIYEJr3qX_4mwt_san8f-X5xKR33TWqtxrX73bj9AYaLMwA_KXc78e-rZh5OFbBxGJ2raXp8iQcyjCYMcusgXNDRkL_cmsX0wBwNtIf5ZQ-cuvQwUX4JgFvyFUDUZ5SG3JBiBXSwXEKoVY3TY_J9ift8Jm_J1dOJ7EOpRK79AnA",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-c3-action-engine": "js-client-browser",
    "cookie": "c3env=lefv202310092005; c3app=gurusearchui; c3AppUrlPrefix=lefv202310092005/gurusearchui; c3csrf=SFMyNTYmZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SmhkV1FpT2lKak15NWhhU0lzSW1OeWRDSTZNVFk1T1Rrek1qQXlOREF3TUN3aWFYTnpJam9pWXpNdVlXa2lMQ0poZEhSeUlqb2llMXdpWlhod1hDSTZNakF4TlRVMU1USXlOREF3TUN4Y0ltbGtYQ0k2WENKbVl6Z3dOREV6WWpFNU5qVmlNREZoWWpNeFpqRXpNVE15WVdNeE9UWXlPR1EyTkRBM05HRTJOVEkyTkRKbE1tTTRaREJpTVRnd1lUVTFabU5sWXpsbVhDSXNYQ0poY0hCY0lqcGNJbWRyWlhZNFpHVjJMV3hsWm5ZeU1ESXpNVEF3T1RJd01EVXRaM1Z5ZFhObFlYSmphSFZwWENJc1hDSnphV1JjSWpveGZTSXNJbVY0Y0NJNk1qQXhOVFUxTVRJeU5EQXdNQ3dpZEd0cGJtUWlPaUpEYzNKbVZHOXJaVzRpZlEub3k4Y1JoUVNTRE1Jc0RYekxRRFptb1NFbzdra1JZbGlNVnlJaUFnVTVWNA%3D%3D; c3auth=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGRldi1sZWZ2MjAyMzEwMDkyMDA1LWd1cnVzZWFyY2h1aSIsImlzcyI6ImMzLmFpIiwiZ3JvdXBzIjpbIkMzLkFwcEFkbWluIiwiQzMuRW52QWRtaW4iXSwic2lkIjoxLCJhdWQiOiJjMy5haSIsImlkcCI6IiIsImMzZ3JvdXBzIjpbIkMzLkFwcEFkbWluIiwiQzMuRW52QWRtaW4iXSwiaWRwZ3JvdXBzIjoie1wiT2lkY0lkcENvbmZpZzo6Z2tldjhkZXYuYzNkZXYuY2xvdWRcIjpbXCJkZXYuT2lkY0RlZmF1bHRHcm91cFwiXX0iLCJzc2lkeCI6IiIsIm5hbWUiOiJmYzgwNDEzYjE5NjViMDFhYjMxZjEzMTMyYWMxOTYyOGQ2NDA3NGE2NTI2NDJlMmM4ZDBiMTgwYTU1ZmNlYzlmIiwiaWQiOiJmYzgwNDEzYjE5NjViMDFhYjMxZjEzMTMyYWMxOTYyOGQ2NDA3NGE2NTI2NDJlMmM4ZDBiMTgwYTU1ZmNlYzlmIiwiZXhwIjoxNzAwMDE4NDI0MDAwLCJlbWFpbCI6Imx1aXMuZmVybmFuZGV6LWRlLWxhLXZhcmFAYzMuYWkifQ.WDWw3mQf246SX1qLXsMzM4CvF-nWqYqBcxnuZCygvyu38btTFSrMFtcBRgRW9cgLBe7FCnOZ3ETOazRTKYuYE9CxgQdowcI6RcoGwwPT0LG08HH_nNHlYf_NplPFIPIeL1JVjT1DiWGmKfMcePqVAFSuliZeG0hgPVlTHSihUIlYfiInecmewt_vLn2-TPdAINyCgZwcJWe36itm85L5NZhi32oDl81kjAlyrDWR7FvKXO1eV-XdaIkCXldlQe3gs_b0JI1U5D22VIo7bsMZeSEmEi8Q8_aqHkFjNNWfsi6lVSM1G7qJmGOAlGDBl2VXRWMF-vI2Z_c40XKNSKZJrA; c3auth=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGRldi1sZWZ2MjAyMzEwMDkyMDA1LWMzIiwiaXNzIjoiYzMuYWkiLCJncm91cHMiOlsiQzMuRW52QWRtaW4iXSwic2lkIjoxLCJhdWQiOiJjMy5haSIsImlkcCI6IiIsImMzZ3JvdXBzIjpbIkMzLkVudkFkbWluIl0sImlkcGdyb3VwcyI6IntcIk9pZGNJZHBDb25maWc6OmdrZXY4ZGV2LmMzZGV2LmNsb3VkXCI6W1wiZGV2Lk9pZGNEZWZhdWx0R3JvdXBcIl19Iiwic3NpZHgiOiIiLCJuYW1lIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImlkIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImV4cCI6MTY5OTk3NzExMzAwMCwiZW1haWwiOiJsdWlzLmZlcm5hbmRlei1kZS1sYS12YXJhQGMzLmFpIn0.p5ENcNewKGQjGr83LXPkJadoNzUzl5-ajd2ZqSPBFF8QeHVO4S8vNIsGIeAm1tCD7S_0y2RxlEpzSwYv9Ppb37Wqvg-0HkScibODwbiZzXbtpPZnywT9inyO1BRQjPgtq-qlAAiPoQCkW-klMJDzOcCNQGL04Zco2Haz0xNnqtoWIYEJr3qX_4mwt_san8f-X5xKR33TWqtxrX73bj9AYaLMwA_KXc78e-rZh5OFbBxGJ2raXp8iQcyjCYMcusgXNDRkL_cmsX0wBwNtIf5ZQ-cuvQwUX4JgFvyFUDUZ5SG3JBiBXSwXEKoVY3TY_J9ift8Jm_J1dOJ7EOpRK79AnA; c3AppUrlPrefix=lefv202310092005/gurusearchui",
    "Referer": "http://localhost:50864/lefv202310092005/gurusearchui/static/console/index.html",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "body": "[\"JupyterHub\"]",
  "method": "POST"
});
}

function set_jpy_hub_gpu_prof() {
    // from env/app
    // Start by default with the GPU profile 
    JupyterHub.config().setConfigValue('jupyterCustomC3Defaultprofile', 'large') 

    // Increase timeout to 24 hours
    JupyterHub.config().setConfigValue('jupyterSingleUserCullTimeout', 24*60*60)
    // Increase disk size to hold large models (if needed)
    JupyterHub.config().setConfigValue('jupyterSingleUserStorageCapacity', '512Gi')
    JupyterHub.ensureService()
}

