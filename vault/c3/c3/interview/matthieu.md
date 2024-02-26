---
id: C3-Technical-Interview
created_date: 27/01/2023
updated_date: 27/01/2023
type: interview
---

# matthieu

- **🏷️Tags** :  #company #c3 #c3-ai #interview
[](#anki-card)

# Notes

# Scorecard Template

****If you are shadowing the interview please write “I shadowed this interview” at the top of your scorecard summary**

## Summary

Matthieu had an excellent interview and interpersonal skills. He would do well at C3.

## Question(s) asked:  

Count distinct elements in every window of size k.

## Evaluation

Numerical scores correspond to the following qualitative assessments:

( 1 - Very Poor, 2 - Poor, 3 - Fair, 4 - Good, 5 - Excellent )

Area: Problem Definition/Comprehension

Score: (1-5): 5

Justification: Matthew quickly understood the problem and approach the solution methodically.

---

Area: Coding Proficiency/Robustness

Score: (1-5): 5

Justification: Matthieu had strong command of chosen language and alternative code paths.

---

Area: Algorithm Efficiency + Analysis

Score: (1-5): 4

Justification: Matthieu had the right approach to algorithmic analysis. He was a bit unfamiliar with line-level optimization analysis.

---

Area: Communication Skills + Structured Thinking

Score: (1-5): 5

Justification: I was able to follow his train of thought with ease.

---

Area: Debugging/Troubleshooting

Score: (1-5): 4

Justification: Matthew relied on a debugger where it may have been easier to reason about the code.

## Code

```python

"""
 * Count distinct elements in every window of size k
 * Given an array of size N and an integer K, return the 
 * count of distinct numbers in all windows of size K. 
 * 
 * Input: arr[] = {1, 2, 1, 3, 4, 2, 3}, K = 4
 * Output:  
 * 
 */

"""

I0: [1, 2, 1, 3] = 3

arr = [1, 2, 1, 3, 4, 2, 3, 3]

# nums[] --n
# list_of_windows[] --- (n - k) * k
# cur_sum --1

def get_count(nums, window_size):
  list_of_windows = []
  for i in range(len(nums)):
    if len(nums[i:]) >= window_size:
      list_of_windows.append(nums[i:window_size + i])

  print(list_of_windows)

  # add distinct windows
  sum_distinct = 0

  for i in list_of_windows:
    cur_sum = len(set(i))
    sum_distinct += cur_sum
    print(i, cur_sum, sum_distinct)
  
  return(sum_distinct)

print(get_count(arr, 4))


def get_count_2(nums, window_size):
  list_of_windows = []
  sum_distinct = 0

  for i in range(len(nums)):
    if len(nums[i:]) >= window_size:
      cur_wind = nums[i:window_size + i]
      list_of_windows.append(cur_wind)
      cur_sum = len(set(cur_wind))
      sum_distinct += cur_sum

  print(list_of_windows)

  return(sum_distinct)

print(get_count_2(arr, 4))


# func(arr)
# [[1, 2], [2, 1], [1, 3], [3, 4], [4, 2], [2, 3]]

# [[1, 2, 1, 3], [2, 1, 3, 4], [1, 3, 4, 2], [3, 4, 2, 3], [4, 2, 3, 3]]
# [1, 2, 1, 3] 3 3
# [2, 1, 3, 4] 4 7
# [1, 3, 4, 2] 4 11
# [3, 4, 2, 3] 3 14
# [4, 2, 3, 3] 3 17
# 17

```

[Coderbyte](https://coderbyte.com/editor/sharing:NdyYTk2R)
