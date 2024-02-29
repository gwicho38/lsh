---
id: C3-Technical-Interview
created_date: 20/03/2023
updated_date: 20/03/2023
type: interview
---

# maegan-lloyd

- **🏷️Tags** : #03-2023 #company #c3 #c3-ai 
[](#anki-card)

# Notes

```


-     
    Typical Agenda

-   Personal Introductions from C3 AI team members


-   Personal Introduction from the BAH candidate
-   Discussion questions from the C3 AI team members directed towards the BAH candidate about their recent technical work experiences to determine suitability for C3 AI project work
-   Technical questions from the C3 AI team members directed towards the BAH candidate to understand how the candidate thinks about solving problems

-   Expect a problem to be presented in the meeting’s chat and be ready to discuss how this problem can be solved using data structures, algorithms, etc.
-   If the BAH candidate would like a collaborative coding environment to type out some code, our team can quickly provide a link to one. We would love to collaborate in this way if you are interested! However, it is not required.

-   [Optional] Discussion questions **from the BAH** **candidate** directed towards the C3 AI team members in order to shed light on topics such as the tech stack we, how the team operates, or anything the candidate is interested in.

-   C3 AI team members

-   There will be 2 C3 AI Solution Engineers on the screen who either work on projects that BAH and C3 AI will collaborate together on or senior level engineers who have worked across a wide variety of C3 AI projects

```

### Question

```md

// Given a list of integers that represent the heights of buildings, return the count of buildings that have an “ocean view” from the top floor. The ocean is off to the right of the buildings. 

// Example Input: [4, 6, 5, 3, 4, 2, 3, 1] <— Ocean over here 

//         Output: ?

```

# Scorecard Template

****If you are shadowing the interview please write “I shadowed this interview” at the top of your scorecard summary**

## Summary

## Question(s) asked:

## Evaluation

Numerical scores correspond to the following qualitative assessments:

( 1 - Very Poor, 2 - Poor, 3 - Fair, 4 - Good, 5 - Excellent )

Area: Problem Definition/Comprehension

Score: (1-5)

Justification:

---

Area: Coding Proficiency/Robustness

Score: (1-5)

Justification:

---

Area: Algorithm Efficiency + Analysis

Score: (1-5)

Justification:

---

Area: Communication Skills + Structured Thinking

Score: (1-5)

Justification:

---

Area: Debugging/Troubleshooting

Score: (1-5)

Justification:

## Code

```ts

[4, 6, 5, 8, 4, 2, 3, 1]

Integers that represent the heights of buildings, return the count of buildings that have an “ocean view” from the top floor. 

The ocean is off to the right of the buildings.

Example Input: [4, 6, 5, 3, 4, 2, 3, 1] <— Ocean over here

Output: 




```

```python

# Given an array of N non-negative integers arr[] representing an elevation map where the width of each bar is 1, compute how much water it is able to trap after raining.

# Input: arr[] = [3, 0, 2, 0, 4]

# Python3 implementation of the approach
  
# Function to return the maximum
# water that can be stored
def maxWater(arr, n):
  
    # To store the maximum water
    # that can be stored
    res = 0
  
    # For every element of the array
    for i in range(1, n - 1):
  
        # Find the maximum element on its left
        left = arr[i]
        for j in range(i):
            left = max(left, arr[j])
  
        # Find the maximum element on its right
        right = arr[i]
  
        for j in range(i + 1, n):
            right = max(right, arr[j])
  
        # Update the maximum water
        res = res + (min(left, right) - arr[i])
  
    return res
  
  
# Driver code
if __name__ == "__main__":
  
    arr = [0, 1, 0, 2, 1, 0,
           1, 3, 2, 1, 2, 1]
    n = len(arr)
  
    print(maxWater(arr, n))
  
# This code is contributed by AnkitRai01


```

```

array = [4,6,5,3,4,2,3,1]
i = 0
left = 0 right =1
temp = []
while (i < array.length){
  if (array[i] > array[i+1]){
        add array[i] to temp
    if (array[left] < array[i]){
        eg if there's a new tallest building
      left = i
    }
  }
}
```


### Questions

-   (Years of) Experience: 2.5 years
-   Communication: 3 
    - Candidate was nervous but continued to engage.  
    - Asked questions about c3 and the role. 
    - Did research regarding C3 prior to interview. 
-   Technical Skills: 2
    - Did not answer the question correctly. Started out with a promising approach but stopped asking clarifying questions. 
    - Was able to discuss her current role with some detail. 


## Notes


```md

_

| | _

_| |_| |_

_| |

0 1 3 1 2 1

[0 1 3 1 2 1]

```