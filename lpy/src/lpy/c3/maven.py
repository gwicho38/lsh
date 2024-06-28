import re
import os
import requests

# Function to extract dependency versions from build.gradle
def extract_versions(build_gradle_content):
    version_pattern = re.compile(r'(\w+)\s*=\s*\'([\w.-]+)\'')
    return dict(version_pattern.findall(build_gradle_content))

# Function to resolve dependencies from platform.build.gradle using versions from build.gradle
def resolve_dependencies(platform_build_gradle_content, versions):
    dependency_pattern = re.compile(r'api\s+"([^:$]+):([^:$]+):\$(\w+)"')
    dependencies = []
    for match in dependency_pattern.findall(platform_build_gradle_content):
        group, artifact, version_key = match
        version = versions.get(version_key)
        if version:
            dependencies.append((group, artifact, version))
    return dependencies

# Function to generate the analogous file path
def generate_file_paths(dependencies):
    base_url = "https://ci-artifacts.c3.ai/v1/artifacts/maven-repo/mavens/"
    file_paths = []
    for group, artifact, version in dependencies:
        group_path = group.replace('.', '/')
        jar_file_name = f'{artifact}-{version}.jar'
        pom_file_name = f'{artifact}-{version}.pom'
        jar_file_path = f'{base_url}{group_path}/{artifact}/{version}/{jar_file_name}'
        pom_file_path = f'{base_url}{group_path}/{artifact}/{version}/{pom_file_name}'
        file_paths.append((jar_file_path, pom_file_path))
    return file_paths

# Function to download files and save them in the specified directory
def download_files(file_paths, download_dir='maven_dependencies'):
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)
    
    for jar_path, pom_path in file_paths:
        for file_url in [jar_path, pom_path]:
            file_name = os.path.join(download_dir, file_url.split('/')[-1])
            try:
                response = requests.get(file_url)
                # response.raise_for_status()
                with open(file_name, 'wb') as file:
                    file.write(response.content)
                print(f'Downloaded {file_name}')
            except requests.exceptions.RequestException as e:
                print(f'Failed to download {file_url}: {e}')

# Reading the contents of the build.gradle file
with open('/Users/lefv/mvn/build.gradle', 'r') as file:
    build_gradle_content = file.read()

# Reading the contents of the platform.build.gradle file
with open('/Users/lefv/mvn/platform.build.gradle', 'r') as file:
    platform_build_gradle_content = file.read()

# Extract versions from build.gradle
versions = extract_versions(build_gradle_content)

# Resolve dependencies from platform.build.gradle
resolved_dependencies = resolve_dependencies(platform_build_gradle_content, versions)

# Generate file paths for the resolved dependencies
file_paths = generate_file_paths(resolved_dependencies)

# Download files and save them in the specified directory
download_files(file_paths)

# Print resolved dependencies and their file paths
for dependency, file_path in zip(resolved_dependencies, file_paths):
    print(f'{dependency[0]}:{dependency[1]}:{dependency[2]} -> {file_path}')

