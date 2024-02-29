---
id: C3-Technical-Interview
created_date: 31/01/2023
updated_date: 31/01/2023
type: interview
---

# christian-fu

- **🏷️Tags** :  #company #c3 #c3-ai #interview

# Notes



## Summary

Christian did a great job solving the problem and was able to derive a second, more efficient, solution. He clearly is able to work as a software professional and would likely do well at C3. 

## Question(s) asked:

```md
/**
 * Count distinct elements in every window of size k
 * Given an array of size N and an integer K, return the 
 * count of distinct numbers in all windows of size K. 
 * 
 * Input: arr[] = {1, 2, 1, 3, 4, 2, 3}, K = 4
 * Output:  
 * 
 */

"""
```

## Evaluation

Numerical scores correspond to the following qualitative assessments:

( 1 - Very Poor, 2 - Poor, 3 - Fair, 4 - Good, 5 - Excellent )

Area: Problem Definition/Comprehension

Score: 5

Justification: Christian quickly identified the problem and was clear about brute forcing a solution.

---

Area: Coding Proficiency/Robustness

Score: 4

Justification: Christian had a moderate-high grasp of his chosen language (Java) and could easily adapt to other languages.

---

Area: Algorithm Efficiency + Analysis

Score: 5

Justification: Christian was able to identify the space/time complexity of his solution with a well-reasoned analysis.

---

Area: Communication Skills + Structured Thinking

Score: 4

Justification: When Christian asked questions, they were clear, incisive, and clearly cognizant of the solution. He would sometimes appear hesitant to engage the interviewer (likely nerves).

---

Area: Debugging/Troubleshooting

Score: 4

Justification: Christian did a fine job debugging. He was sometimes reticent to ask for clarifications where assumptions where vague.

## Code

```java

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
