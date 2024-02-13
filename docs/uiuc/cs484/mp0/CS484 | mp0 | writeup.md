# CS 484 | MP0

## Part 1

The variation is caused by cache misses resulting from array size, non-sequential access pattern, and invariant stride. 

First, variation increases with array size because larger arrays will result in higher cache miss rates. Each cache miss requires reads to RAM which is significantly slower than CPU caches. 
Second, variation increases due to non-sequential memory reads. Irregular memory accesses limit CPU optimizations designed to prefetch instructions into memory. The result is additional cache misses and reads to RAM. 

Third, the stride value does not change the size of the array. The larger the size of the array, the higher the likelihood that cache misses will result in memory reads that are significantly apart while not using the entire byte-block allocated to such operation.

## Part 2

| Test           | CPU Time (-O0) | CPU Time (-O3) |
|--------------------|----------------------|----------------------|
| test1              | 0.0022               | 0.0000               |
| test2 version1     | 0.0029               | 0.0008               |
| test2 version2     | 0.0018               | 0.0009               |
| test3 version1     | 0.0091               | 0.0018               |
| test3 version2     | 0.0032               | 0.0004               |
| test4              | 0.0113               | 0.0078               |
| test5 (dimensions 1023) | 5.2954        | 1.2841               |
| test5 (dimensions 1024) | 7.0119        | 3.6226               |
| test5 (dimensions 1025) | 5.3372        | 1.2918               |

This table shows that compiler optimizations (-O3) significantly increase the performance for all test cases compared to no optimization (-O0). 
