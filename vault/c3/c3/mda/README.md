#git  #c3-ai 

### BACKGROUND

[12:10 PM] Jared Morris


        
<mark>2.  MDA HGV Trajectory Generation COE</mark>
```ad-note

### MDA HGV Trajectory Generation Trial
    
    1.  Elliot Kirk, Jeff Schneider, Tim Polio, Jeff Kreuger

### MDA HGV Trajectory Generation COE

	1.  producitonizes the trial from (1)
        
	2.  ingests more "modern" formats from MDA instead of their old clunky stuff
        
	3.  100x better UX
        
	4.  adds UI capabilities and APIs for generation of data via **_api, not Jupyter_**
        
	5.  adds Emissive IR Signature Generation

### MDA Parametric Threat Space (PTS) Trial  
    
    1.  This is the main trial we've been discussing
        
    2.  scope is to expand **_Emissive IR Signature Generation_** into **_multiple objects_**  (e.g. Cone splits and creates 2 debris objects + multiple internal objects (warheads, decoys, etc). Or countermeasures appear out of a shroud.
        
	3.  Due to our designs & ML models, we will thusly be also doing multi-object for _kinematic trajectories_
            
    4.  Apparently we are adding Reflective IR too (mostly sun glint) -- this is not an ML model. It's not a full raytracing simulation due to computational issues, but still pretty close to the idea of RayTracing... should be MDA gives us a "lookup table" per threat we can just query.
        
        5.  However raytracing might be feasible. MTSI described the existing system as some mix of Phong/Raytracing approximations.
            
        6.  As with most things at MDA, the unacceptable computation speed of raytracing may have been their fault and it _is_ the best way to do things if properly optimized
            
    7.  Adds RBAC to demonstrate the ability for two programs that _sometimes_ share data to be on the same tenant/tag without data spill
        
### Cloud 2.0/IATT/Data Catalog(?)
    
	1.  Create a giant data model for the Flight Test Data crew, just find data and start making a giant package
    
	2.  Mason Shuler, Kevin Eveker, Jared Morris, (Mitch & Luis soon)
    
	3.  Deploy to IL-6 SECRET Cloud at MDA (Azure)
    
	4.  Not required scope, but to show value, add in some UX to show what we're doing and how it's valuable (data lineage, data catalog, Metadata vision). Pretty hard to sell some abstract "data mode"
```

### Architecture & Development
#### Application Spec
[Mike Diehl: PTS Trial - Draft application design spec posted here: https://c3gov.box…](https://teams.microsoft.com/l/message/19:e5da4be08b3e41268d10ce39c82e1eea@thread.tacv2/1653057610225?tenantId=53ad779a-93e7-485c-ba20-ac8290d7252b&groupId=09aa0e34-b0e1-4f36-9ca0-c78aebe6093b&parentMessageId=1653057610225&teamName=MDA&channelName=PTS%20Trial&createdTime=1653057610225 "https://teams.microsoft.com/l/message/19:e5da4be08b3e41268d10ce39c82e1eea@thread.tacv2/1653057610225?tenantId=53ad779a-93e7-485c-ba20-ac8290d7252b&groupId=09aa0e34-b0e1-4f36-9ca0-c78aebe6093b&parentMessageId=1653057610225&teamName=MDA&channelName=PTS%20Trial&createdTime=1653057610225") 

posted in MDA / PTS Trial at May 20, 2022 10:40:10 AM EDT

#### What is a Scenario
Scenario == unique(LaunchPoint, AimPoint, ThreatMissile)

#### Bring Up New Data Into Container

![](Pasted%20image%2020220523112804.png)

#### ML Pipeline
IR models are trained outside. 
Driver spec is creating population segments and associating IRModel with the training and with the 

![](Pasted%20image%2020220712110130.png)


when happens when new data comes in?

![](Pasted%20image%2020220712110517.png)

![](Pasted%20image%2020220712172226.png)

#### JUPYTER NOTEBOOK HOSTED LOCATION

https://statics.teams.cdn.office.net/evergreen-assets/safelinks/1/atp-safelinks.html

```
Jupyter will error unless you run it separate from c3server _after it has had ~2 minutes to actually come online_


Docker-compose waits until it's healthy but it still needs to "boot up"

Hence the instructions are  

`docker-compose up c3server postgres cassandra` to explictly delay jupyter

After c3server, postgress, and cassandra are up, then run: 

docker-compose up -d jupyter

```

-------------

#### Data Object Count

```
[12:25 PM] Mitch Wagner

We have 1 trajectory per object per montecarlo per scenario

  

[12:25 PM] Mitch Wagner

We have ~500 montecarlos

  

[12:25 PM] Mitch Wagner

~ 1 object right now

  

[12:25 PM] Mitch Wagner

We also have 4 IR bands

  

[12:25 PM] Mitch Wagner

Each one of these files is approximately 1000 lines

  

[12:26 PM] Mitch Wagner

so my math shows (500 x 1000) + (2000 * 1000) which is approximately 2.5 million

  

[12:26 PM] Mitch Wagner

We estimated 10 million data points last time and we dropped some constants above (maybe 2-3 objects and 2-3 scenarios)

  

[12:27 PM] Mitch Wagner

So 10 million is still a fair order-of-magnitude estimate

  

[12:27 PM] Mitch Wagner

AKA, a drop in the ocean of C3's significant figures for this meaningless metric ![😀](https://statics.teams.cdn.office.net/evergreen-assets/personal-expressions/v1/assets/emoticons/laugh/default/20_f.png "Laugh")
```

### ENVIRONMENT

#### Developer Access

 ![image](data:image/jpeg;base64,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oXiVvKxKSqSLKpTI6gtnAIrTg1Sx04adHbvNOttJKZGMe04cY+UZPSqeqXguLeOFL+W5UMW2tAsSrxjt1NAD9X0qLT5obeJi0jYDO0q4JIHYcqOe9Q3GlyrqUNjBGxmkjUhWdTuJGeCOMelJqVxb3+ryThnSCTaCxTJAAAPFaB1HTo9Wsb2OeZ1gjWJlMOOApGRz69qAM2XSL2GWCMxB2nJEfluGBI6jI7ilfSLxJoYhGshmYrGYnDqSOoyOMirenatDYxWAKuzQTSs4A/hdQMj361OusRwXdszX013CrNuX7Ose0Mu3Ix1bmgCjfaWbDT7aaRgZZZHU7HDLgYwQR+NZtaV9PZjS7WytJZZfJkd2d49oO7HQZ9qzaACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACprT/j8h/3x/OoamtP+PyH/fH86AJLsRfbJ/nf/WN/D7/WodsX/PR/++f/AK9Ou/8Aj9n/AOujfzqaw0y41LzltijSxJvERbDSDvtHcigCvti/56P/AN8//Xo2xf8APR/++f8A69MIIJBBBHBBHSpbR7VLuJ72OWW1BzKkLhXYexOQDQA3bF/z0f8A75/+vRti/wCej/8AfP8A9eup8QeG7NPFMHh/QILprpgpdrmZSrbkD56DaACck+lLe+DGj0rRFsZIb3UNQupohJbTh4WVQMYPGMfNnPpSA5XbF/z0f/vn/wCvRti/56P/AN8//XrePgzU3vbG2tprK6W+kaKGeCbdHvUZZSccECo5vClzbXOnpNf6d9nvWZUuUuA0aspG5C2OGGR+dMDF2xf89H/75/8Ar0bYv+ej/wDfP/162/E3hyLQ9fk0+HUrWWPzjGpaUbohxzLgfL1pdW0BLXX7XTFlt7US20Uhmlut8TFlyWD44B7DFAGHti/56P8A98//AF6NsX/PR/8Avn/69dLqvg17fxU2i6df2lzI8jpChmHmDaucOMYDHsO9TeDvB0euN9o1SY21g6TLG6uA/mIFySCPujcM0gOU2xf89H/75/8Ar0bYv+ej/wDfP/1667V/BK6VoekNLcCLVbq5eG5WeQJFDhdy5PbjBP1rO/4Q3UnvtPtraazuk1B2jt7iCbMTMoyyk44I9xQBhbYv+ej/APfP/wBejbF/z0f/AL5/+vWveeF7yyksN93p8kN67Rx3MdyDEjr95WbsRUknhDUxd2EFq9rerfuyW89tLujLL94EnG3A5Oe1MDE2xf8APR/++f8A69G2L/no/wD3z/8AXrdn8G6nHJp620lnfLqErQ2z2s4dWZfvZPGAPf0qvf8Ahm9sDZsJ7S6gu5vIintpd6eZkAqT2IyKAMrbF/z0f/vn/wCvRti/56P/AN8//XrV1vw1daBuS8u7B7hJfKkt4LgPJGeuWA6Csu2gN1cxwLJFGZGxvlfai+5J6Cl5gJti/wCej/8AfP8A9ejbF/z0f/vn/wCvWrJ4Yvxc2cVu9tdreOyQzQS5Qsv3gScYwOee1Xrnwoy6bpS2kkN3fXt1LEJIJt0RVQCOe2Oc1m60FbXcrlZzm2L/AJ6P/wB8/wD16NsX/PR/++f/AK9dfaeELNho8c9ykzXk9wjzWk25CqJuXHHBznNY9toRvtCsbi1DvfXeoNaLHkBSAoI/nSVeD/r1/wAg5WZG2L/no/8A3z/9ejbF/wA9H/75/wDr1oy6BcLqNvY21zZ3s87FFFtNu2sOobOMfWi98P3Vl9mbzra4huZfJSa3l3oJMjKk9jzV+0j3FZmdti/56P8A98//AF6NsX/PR/8Avn/69bN1oceg3Df21JDcCNjHJa2V0vnI2OCcg4FXNa0PTo9Vg0bR7W9e/mETq80ylCHXdjGBjGeue1T7aN1YfKzmtsX/AD0f/vn/AOvRti/56P8A98//AF63rbwjcy6nYwPdW8lpcs4N1bP5irsGXH+8B2qnfw6ZOLYaVa38Pmy+WHumDJIDwCCAMHPUU1Vi3ZByszdsX/PR/wDvn/69G2L/AJ6P/wB8/wD162bnwnqFtex2PnWUt883km2hnDOhxnLDsMDr2psnhe+W6soYZrS5W8kaKKaCbdHvXqpPYij2sO4crMjbF/z0f/vn/wCvRti/56P/AN8//XrRsPD9/qK2ZtxF/pdw9tFufHzqu459BjvTNS0S602KCVpLe4hnYoktvJvXeOqk+ozT9pG/LfUVnuUdsX/PR/8Avn/69G2L/no//fP/ANetTxRZ22maw+nWiY+yRJHK+STJLtyze3Jxj2qHVI9Os9TjFp/pNoIY3dRL95iuWG7tz+VU3Z2BK6uUdsX/AD0f/vn/AOvRti/56P8A98//AF61tS0df+EjXTdOUqJURkWR84JTccn86zvsE32O3u2aNYZ5WiVmboy4zn0HNSpppMp05JtdiLbF/wA9H/75/wDr0bYv+ej/APfP/wBetG90eRNXtdPtogZZ4oyuJQ6uzD7wPGAf0qrfWP2GRU+1WtxnOTbybtpHUH0oU0wcJK9+hBti/wCej/8AfP8A9ejbF/z0f/vn/wCvSQxedMsfmRx7jjfI2FX6mug1nQYbfULXTdNVZrp8Kx+0bmYlQSSuAEHXnPSiU0nZhGnKSbRgbYv+ej/98/8A16NsX/PR/wDvn/69XbrRbm1+znzIJ4riTyklhk3LvyMqT2PNWJPDN7HfR2Pn2bXby+UYUnBZDgn5vQcUe0j3H7KfYytsX/PR/wDvn/69G2L/AJ6P/wB8/wD16vXGiXFs1runtGjuWZFlSYFFZfvBj2xUn/CPXjXVnDDJbzi7ZkhlikyhYdQT2NHtI9w9nPsZu2L/AJ6P/wB8/wD16NsX/PR/++f/AK9aL+Hr1ZrSKJre4+1MyRtDKGUMv3gT2xVq48Oslhpwtnjubu7uJIw0Mu5GCgY+mOc0vaw01BUp66GJti/56P8A98//AF6NsX/PR/8Avn/69XrnRZ7UwM1xavBM5jFwkuY1YdQx7U3UNHn06C2mea3ljuQTEYX3ZA6n6U1OL6idOSvpsU9sX/PR/wDvn/69G2L/AJ6P/wB8/wD16faWdxfXcVrBGWllbaoPA/Oti48Oslhpwtnjubu7uZIg0Eu5GCgY+mOc0SnGLs2EacpK6RibYv8Ano//AHz/APXo2xf89H/75/8Ar1bvtIuLCKOYyQzwyMUEtu+9dw6qfeqcZWORXmiZ4wcsmSu4eme1NNNXQnFp2Yu2L/no/wD3z/8AXo2xf89H/wC+f/r1o6tp8EWtraWmIYpI4nXzpeF3IGOWPbmoL7Sp7GKGYyQzwTEqksD7lJHUeuaSmnbzG6clfyKu2L/no/8A3z/9ejbF/wA9H/75/wDr1LZWM+oXkdrCAJZMhA5wCQM4+vFPi0yeS2huC0UUU0xgRpX2/MBkk56AetNyS3YlFvVIr7Yv+ej/APfP/wBejbF/z0f/AL5/+vVy70e4tBbuJYJ4bh/LjlhfcpYEZB9DyKlvNAuLGdYJ7qxWcy+U0f2gZjPq3oKXPHuP2cuxnbYv+ej/APfP/wBejbF/z0f/AL5/+vWoPDtyZ7cfaLZrabeftMb7kQIMvnvwO3ep73wy8dnBcWYun82ZYRHPEEZiwypABPX0ODS9rC9rlexna9jE2xf89H/75/8Ar0bYv+ej/wDfP/16vz6Ymn3EP2ueG4jMhSWOzmDOpHbpx9eRVjXdKt7C1s7iKG5tJLjdutblgXUDGGyAOD7+lHtFdLuL2crN9jI2xf8APR/++f8A69G2L/no/wD3z/8AXogiM86RB0QucbpG2qPcnsKt3mkTWaQSme3lt52KJPFJlNw6g+mM1Tkk7MlRbV0VNsX/AD0f/vn/AOvRti/56P8A98//AF6uaxYjTp4IlVfmt0kLLL5iuTn5gcdD6UmrwWVvdxpYSeZEYI2Y792HK/MM+x7UKSdrdRuDV79Cpti/56P/AN8//Xo2xf8APR/++f8A69R0HpVEEm2L/no//fP/ANejbF/z0f8A75/+vWs+lWl34gstP06cGKdI98m7dtYrl/y54qC4bRPPjW3hv/LSQrIWkUmRfUcfKc/Ws1NPY0dNrdlDbF/z0f8A75/+vRti/wCej/8AfP8A9etfXdKt7C1s7iOC6tJLguGtbpgXUDGGyMcH39Ko6Tp51XVbeyD+WJCdz4ztUDJP5Cmppx5ugOnJS5OpW2xf89H/AO+f/r0bYv8Ano//AHz/APXq7ex6dIsP9nW97Huk2B7hgVkHYggDB9qnuPDd9bXSWhktZLxpRF9njmDOCehI7CjnXXQPZy6amXti/wCej/8AfP8A9ejbF/z0f/vn/wCvWk/h68FxaxRS2063Uphjlhl3JvHVSexqG00a8vRbGEIftFwbaPLY+cDPPt70c8bXuL2c72sU9sX/AD0f/vn/AOvRti/56P8A98//AF6t3+kXGnwxzPJBNE7mPfBJvCuOqn3p2hWMWpa3a2c5cRSsQxQ4PCk8flRzrl5ugckuZR6lLbF/z0f/AL5/+vRti/56P/3z/wDXrWm0eG7tbW60cXDie4NsYJiCyyAZHI4II/LFMPhy9863jiltZhPIYUkilyokAzsJ7H09aXtI9WP2U+iMzbF/z0f/AL5/+vRti/56P/3z/wDXq1BpF5cwwyRRg+dcfZo0zhmcDJ49B3NPu9Kl01IrmYwXVqZCjG3lyNw5KE44OO9Pnje1xckrXtoUtsX/AD0f/vn/AOvRti/56P8A98//AF61dU0pBrdvZabC/wDpMMTpGz7judc4z6U1vDt79otYYpLacXUphjkhl3IJB1UnsaSqRsncbpSu0lsZm2L/AJ6P/wB8/wD16NsX/PR/++f/AK9aM3h++ikt0jMNyZ5TAhgkDASDqp9DUd5otzZRxSGW3nikk8rzIJNyq/8AdPoaanF9ROnNbopbYv8Ano//AHz/APXo2xf89H/75/8Ar1e1PRLjSVcXE9oZkba0McwZ19CR6UzV4bK2u4lsJBLEYI3f593zkZYZ+vahTT2BwlG9+hU2xf8APR/++f8A69G2L/no/wD3z/8AXrV8S2FtZalC9mhjtby2iuooyc7Aw5XPsQaxqsgk2xf89H/75/8Ar0bYv+ej/wDfP/16jooAk2xf89H/AO+f/r0bYv8Ano//AHz/APXqOigCTbF/z0f/AL5/+vRti/56P/3z/wDXqOigCTbF/wA9H/75/wDr1LaCL7ZD87/fH8Pv9arVNaf8fkP++P50AF3/AMfs/wD10b+dW9GurOwumvLlZZJYRut40OAz/wC0ewH61Uu/+P2f/ro386hoAnvbybUL2W7nKmWVtzbVwPyptqLZrqMXrTLbE/vDAAXA9geM/WoqKAO2u/Fukf8ACaQ6/aQX7xvEYLqGYIp8vyhH8hBPOOeaLXxZpGiLoUGkw380OnTzvK9xtR5FlXaduCcEDp9K4migDtl8XWtvrGm3R1TXdTgtpHkdL3YNuUKjaAevPJNc8+qxnw3punLG/n2l3LcMxxtYMEwB3/hrKooA6DxDqGja3r7alGdQhW8kMl2jIhMeQP8AVnPzd+uKd4n1TSNVls7nTzfiaCCG2KXEaBSsa43ZUk5PpXO5ooA6nUL6LW/F8Gp+HkvE1O4uBOYZyiqkgwflbPIyD1xxWz4h8U2Fr4mv7e1i/wBCj06eziW2YFRPKd8jg9xvJGR6CvPaKAOx0zxnEiac2rxT308F/JdTSPtbIaIIpGerKQDg8cCtBvHVglzoTGXVb/8As66mmluLvYHlDptAUA4GPSvPqKQHVaL4msNOt9EhurOSdbC8uLiUYUgiRQFKg9WUjPPHArbh8Zwz6hodtanUdSmguZhJLfOiNMkqbCFOcJgZxnj8686ooA9Iur+08Ew+HIreG5L21xcyzQTyJ53lyKEydhIU46f7ue9YGq+IILibTjHq2t6hHb3Szul/sAUAjhQCct15NctjFFMDR1i/h1PxJe6iI3EFzdNNsb720tnB98VojVtEtfGMWpWGmyR6XHjFtJhmU7cFhkkEg8jNc7RSklJNMFo7nav4ytY20wB9Qvvss0rTS3RUPIkibSFweMDoKrweItJ0uLSbawhvZoLOeZ5jOFVpFkXaQuCcECuSorH6vDb+uv8AmyudnW2/iTStK/seLT4byaGxuJpZWnCq0iyLtOME4IFVJdW0uC10/T7F9RFrb3bXUlwQqzBiABsAOOMdzzXO0U1Qje/9df8AMOZnYT+LbWPWNKvoEnupbXzBcXMsaRSzq/GPl4yBnBPeqGp63DPJZGPUtXvUhuFmZL3bhQCOFAJy3vXPUUKhBNNBzMua1eJqes397ErKlzM8ih+oBPetmTxNCPF9trMVvIYYoY4XiYgMwEexsfriuaoqnTi1Z9rCuzqrfxJYaONOt9LhuZ7a3uJJ5jc7VaQOuwoMZxhe/rUN5renrpen6dZPfzQW16LkfatoMa8fu1AJ/PiuboqfYRvf+v61HzM3o/EEcPjaTXUgdoXuXkMTEBijZBGfXBq3B4g0zSm0qDT4rua1tL1ryVpwqu5I27QBkDA79zXLUU3Rg9/QOZnc6Jqmkf2poun2AuzFBezXDyXO1dwaMjAweOmKwNU1KwbSLXTNLW58qK4e5aW4ADb2AAUAHoAOvesWilGilLm/rr/mDk7WNjxNe2up6ydRtXz9qiSSZNpBjlxhl9+RnPvWMRkYpaK2JOhbXLE61p+rCK48+IItxEdu0hU25U9cn3qve3ulSafZ6dbfbBBDPJJJLIq7iGx0GccY71jUVmqUU15GrqyaafX+v0N6/wBR0y5vrG5gk1CNrdI4mIVAwVBgMpz97OOKj1rVbTUWs9glmeLPnXMsaxvMCehC8cDv15rFooVNJp9gdWTTXcu6vLYXGoSPplu9vaFQEjkOSDjnue9aJ8QInisaxFE/l4ClCQGxs2nB7HuKwaKfImrP0Eqkk7rvc3L/AFeKaSzK3+p3aQziVlu9uAAR0APX3qOHV4Y/Frau0chhNw8uzjdg5/DPNY9FJU42sDqyvc29L1m1sodOjntmlFtcyzOMAghlABGe4IzzWi3ie1WbSyXv7r7HcSSvLcbdzhlwAADxj0rk6KToxbuyo15xVl/X9WN3TtdhsbewjaGR/IuJpJQCBuSRduB79asQa9YaYNLj0+O6kSznlkdptqlw64OME4IFc1RQ6UXv/X9XBVppaf1t/kjevNUs7ua0S4vdWvbRJt8sc5UYX0XB6+9Ranq6S6kuoadc3kUwGxQyKgiTGAqbSeMVjUU1TihOrJm1ZeJb+O/t5r66uLu3jY7omfqCpU498E1bh17T9MGlx6fHdSJZzyyO021S4ddpxgnBArmqKTpQYKtNdf6/pG7f6458lrLVtVlkjcsGuCo2ZGOME84yM1nXerajfw+Td3s88YO4LI+QD61Toqo04roTKpKXU6D+2dNOq6fqUlvO0sSIk8TBSh2ptDL79DgjtTtT8RmW0s47K8v2ubeaST7VOQGIYAYGDx0rnaKn2Mbp9i/bTs13NFtd1WSSF5r+eXyZFlQSPkBh0Nadz4hsZNesbmKycWFtubyGwTvcksw7dTxn0Fc3RTdKL6EqrNdTotU163u7SwgWW9uWtrozvNc7csDjgAHjpVVNWtv+EtfVpLdpLdrhpfLYAtg5x7ZHX8Kx6KFSilYbrSbv/Wh1x8SWU0cFnLcX0qEzJLdXIBIDqACFHYEDj0p95rH9nyJexw2sskt5HcSyQ3gkV2RSDhcZUEHv0rjqKj2ES/rMzUn/ALDN0jxNqHlO7NKGVAyA9AvPJz64qTUtRs5dOs7C2N1NHBK0jTXOAx3Y+UAE4HHrWPRWnIrq/Qz9o7NJbm3/AGjpNv4mhvrOwddPjwfIkILZxgnkkdeRmptW1q01GwtLJp9QnEVw0klxOF3FSAMKAcDHpXPUUvZRun2H7aVmu5r61eadfJataG7EkEKQYmRQpVc88E889Kyo08yVEBA3MFyTgDJptFVGPKrIiUnJ3Zs+KYNKtfENxb6MS1nEFQNv3hnA+Yg9xmsaiiqJLemXzaZqlteogcwvu2now6EflmrM/wDYRuI2hOo+U8haUMqZRccBeeTn1xxWXRUuKbuWptKxsalqNnLptpp9qbqZIZWlaa5xuOcDaoBOBx69acdWsbLxJFqGlWbxWkeB5EjckEYbnJ65NYtFSqatb+tR+1le/p+Bu3eq2I0y2sLNr2SGK7FwPtG392v9xcH9ajGtJH4ufWUhZo2uGk8tjhipyCPrg1jUUKnG39dRurJu/wDWh0MWtWGnHT4rCO5lgt7w3chn2qzHGNox6DvV3StR0z+09HsrIXOyPUGuGkuNq5DLjHB4xiuRoqXRi0VGvJP+v66GxqF9YfYFsLFbgxm6a4lefAOcYCjHYDPNTRappVn4pt9QsbSeGxiHMWQXztIJGT7+tYNFV7NWsT7WV7+n4HRQeILbTJLCPToJ2t7e4a4kM7APKzDacY4XA6VDqWsiUQNbalqdw8UwlUXZUKhHTGCcn3rDopKlFO4OtO1jpbrxNB/blhe2Vq8dtas0hhYgFnckyEEdOvH0qlrOpx3tssUWoancrv3FLsrtUY4xgnJ96x6KapRTTXQJVpyTT6nQf27aLqOm6okU/wBqtkjimiOPLZVUqSp65I9RVvSNQ09NT0iwsPP8hb/7TJJc7VOduAowegHeuUoqXRi1YaryTudJHrtlpctsunRXEiR3rXUpmIBOQV2rj0BPP0qtqerR3KwrHqGp3KrMJCl2V2qB6YPJ96xKKapRTuJ1pNW6FzV7xNQ1i8vI1ZUnlLqG6gH1qnjPGQM9z2oorRKysjNtt3ZseJb+3vtSiSzcyWlpbR2sMhGC4QctjtkkmseiimIKKKKACiiigAooooAKmtP+PyH/AHx/OoamtP8Aj8h/3x/OgAu/+P2f/ro3862tK0K3/sWbX9XeRdNjJjjjgOZJpew/2R7mse7jf7bP8jf6xu3vVzSdXvtHMywxiW3uEKT20yFo5B7j1HrSAq3+nXWmyxx3SBGliWZAHDZVunSl0y1S91KG2kLKkhIJXr0J/pVbY/8Acb8jUttLcWlzHcQqwkjbcpK5pgaGnaVBdpp7SSSL9pmkjfbjgKuRipI9Js7s2Ulu88cErSLIJMFhsGSRj1FQNrF8ZLdkhhiFuzNGkcOFBYYPHeoIL+9t0t1iG0W8jSR/J3bg59R7UAa62NpqVlpUFqZIYZJpixkwWUAAnnvwKo39lp9skE0cpdGYrJAk6O4GOGBHHNMfVr5mtjHHHALZi0SwxbQCev1zVe6uZLtVU2kEIBJ/cw7ck+tAGl4jng/tBLVVlEMG0bAVCgbR93jg/XNLNYw3fiCxtWklEEsEZBIG5V2kgcDBrMmubi4vTdzRK8hIJUx/KcDHIqy+sXr3EM4t4ElhACMkGDgDAH0waAJ4tItL57BrWSaKKd5Ek80gkbBkkY45FSf2LZT3NqkF0FV2fzYxMsrKqjduBX1xisyG9vbdLdYsr9nkaSMhOctjOfUcdKlOpXQnhmhtoLd4mLAwwbck9c+o9qAJ9Q+ynQbF7RZFjaeXIlILA/L3HUVj1evL65vYYoXgjjiiJKJFFtAz1qn5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtFO8t/7jflR5b/3G/KgBtTWn/H5D/vj+dR+W/wDcb8qmtI3+2Q/I33x296AC7d/ts/zt/rG7+9Q73/vt+dS3X/H3N/vt/OremorWl/uUHEQIyOnNVGPM7CbsjP3v/fb86t21jd3djf3kTDybFEebc+Dh3CDA78mqddFoP/IpeLv+va1/9KFqRnPb3/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dG9/wC+350lFAC73/vt+dTWjv8AbIfnb747+9QVNaf8fkH/AF0H86AP/9k=)  

  
-    [](https://parametricthreat-stage.c3.ai/static/console/# "https://parametricthreat-stage.c3.ai/static/console/#")groups: [...](...)(https://parametricthreat-stage.c3.ai/static/console/# "https://parametricthreat-stage.c3.ai/static/console/#")
    -    [](https://parametricthreat-stage.c3.ai/static/console/# "https://parametricthreat-stage.c3.ai/static/console/#")0: [{ ... }](https://parametricthreat-stage.c3.ai/static/console/# "https://parametricthreat-stage.c3.ai/static/console/#")
        -    id: C3.Group.Developer
-    name: luis.fernandez-de-la-vara@c3.ai
-    [](https://parametricthreat-stage.c3.ai/static/console/# "https://parametricthreat-stage.c3.ai/static/console/#")meta: [{ ... }](https://parametricthreat-stage.c3.ai/static/console/# "https://parametricthreat-stage.c3.ai/static/console/#")
    -    tenantTagId: 18
    -    tenant: parametricThreat
    -    tag: dev
    -    created: 2022-06-03T16:18:18.000Z
    -    createdBy: jared.morris@c3iot.com
    -    updated: 2022-06-03T16:18:33.000Z
    -    updatedBy: jared.morris@c3iot.com
    -    timestamp: 2022-06-03T16:18:33.000Z
    -    fetchInclude: []
    -    fetchType: User
-    version: 3
-    id: luis.fernandez-de-la-vara@c3.ai
-    user: luis.fernandez-de-la-vara@c3.ai
-    typeIdent: MBR:USER
-    email: luis.fernandez-de-la-vara@c3.ai
-    familyName: Fernandez de la Vara
-    givenName: Luis
-    externalSource: okta
-    externalSourceId: 00u1khnxo4jt5mCVn1d8

#### DOCKER CONTAINER SET UP
c3fed-mda/mda/mdaTrajectory/resources/docker/local-compose-7.30

#### Reset Container
docker stop c3server-flowers && docker rm -v c3server-flowers && docker-compose up -d c3server

#### Bringing Data Into Classified Environment
`

```
Mitch Wagner when you become SysAdmin, here's how to bring unclassified media into the environment. A _technical_ side -- Mike typically handles the _security_ _process_ side
```


#### TECHNICAL DETAILS
**USB**

USB Is for when we get the Unclassified HDD with the Tableau Write-Blocker.

**OPTICAL DISK DRIVE**

Optical Disk Drive is our current workaround -- Mike is just burning CDs from his stack of blank CDs at home -- until we get the drive & blocker

Using `usb-storage` in the ODD one is _not_ a mistake. It's confusing I know

_see also, ~/lib/mda_

#### Get API access for graphs / MapBox

`setConfigs.js` inside the MDA Trajectory Resources directory. `resources/scripts/setConfigs.js`

```ad-note
UiSdlMapbox.inst().setAccessToken(

'pk.myTokenFromMapboxcom.-someMoreBase64'

);

  

FileSystem.fileSystemConfig().setConfigValue('c3fs.aclEnabledMounts', ['ATTACHMENT']);
```
  

This is kinda outside the scope of MDA -- Mapbox API tokens are a thing everywhere

[5/6/22 12:54 PM] Jared Morris

You can use mine for now, I'm way way under the free dev limit which I think is 10K requests/day

  

[5/6/22 12:54 PM] Jared Morris

	UiSdlMapbox.inst().setAccessToken('pk.eyJ1Ijoiam1vYXBwczEiLCJhIjoiY2tuaTNidmV6MDEzaDJ2cGVqeDJndW90NyJ9.-ERlg4lE9cyKZJBHRyaolQ')

  

[5/6/22 12:54 PM] Jared Morris

c3ShowType(UiSdlMapbox) to see how to set API tokens and API URLs (defaults to mapbox.com, but critical for Atlas (the airgap version))

#### Reference Alias(es)
```ad-note

alias prov-mda='cd ~/c3/provisionLocation && c3 prov tag -t mdaTrajectory:dev -c mdaTrajectory -u BA:BA'  

alias prov-mda-gsts='cd ~/c3/provisionLocation && c3 prov tag -t mdaGSTS:dev -c mdaGSTS -u BA:BA'  

alias prov-mda-pts='cd ~/c3/provisionLocation && c3 prov tag -t mdaPTS:dev -c mdaPTS -u BA:BA'  

alias prov-mda-ui-lib='cd ~/c3/provisionLocation && c3 prov tag -t mdaUiLib:dev -c mdaUiLib -u BA:BA' 

alias prov-mda-um='cd ~/c3/provisionLocation && c3 prov tag  t mdaUserManagement:dev -c mdaUserManagement -u BA:BA's

alias ui-mda='c3 ui --log-dir ~/dev/c3log/mdaTrajectory --with-tests -W ~/c3/uiWorkingDir/mdaTrajectory -e http://mdatrajectory:8080 -t mdaTrajectory:dev -a ~/c3/c3fed-mda/mda -u BA:BA --bundler-port 50081'  

alias ui-mda-pts='c3 ui --log-dir ~/dev/c3log/parametricThreat --with-tests -W ~/c3/uiWorkingDir/parametricThreat -e http://mdapts:8080 -t mdaPTS:dev -a ~/c3/c3fed-mda/mda -u BA:BA --bundler-port 50082'  

alias ui-mda-ui-lib='cd ui --log-dir ~/dev/c3log/mdaUiLib --with-tests -W ~/c3/uiWorkingDir/mdaUiLib -e http://mda-ui:8080 -t mdaUiLib:dev -a ~/c3/c3fed-mda/mda -u BA:BA --bundler-port 50089'  

alias ui-mda-um='cd ui --log-dir ~/dev/c3log/mdaUserManagement --with-tests -W ~/c3/uiWorkingDir/mdaUserManagement -e http://mda-user-management:8080 -t mdaUserManagement:dev -a ~/c3/c3fed-mda/mda -u BA:BA --bundler-port 50088' 

alias ui-mda-notest='c3 ui --log-dir ~/dev/c3log/mdaTrajectory -W ~/c3/uiWorkingDir/mdaTrajectory -e http://mdatrajectory:8080 -t mdaTrajectory:dev -a ~/c3/c3fed-mda/mda -u BA:BA --bundler-port 50081'  

alias ui-mda-pts-notest='c3 ui --log-dir ~/dev/c3log/parametricThreat -W ~/c3/uiWorkingDir/parametricThreat -e http://mdapts:8080 -t mdaPTS:dev -a ~/c3/c3fed-mda/mda -u BA:BA --bundler-port 50082'

```

#### Windows VMs
```ad-note text

The VM is up and ready to go. You can also use this one for one of your developers when they finally come on board and get their [c3.ai|http://c3.ai] email.

Download the Microsoft RDP client from the app store.

Create a PC entry with the IP address of 20.120.168.181

Log in with the following:

     U: AzureAD\\first.last@c3.ai

     P: AAD MS Pwd

You must be logged in to the VPN or if needed, I can enter your fixed IP for the office into the firewall rule. Just send that to me.

When you log out, just Sign Out. Don’t shut down or else we’ll have to restart it for you.

If you ever have to refer to this VM in future tickets, use the name W[in10-ITREQ21966|https://portal.azure.com/?bundlingKind=DefaultPartitioner&configHash=rvDdY3lwe5D9&env=portal&helppanenewdesign=true&l=en.en-us&pageVersion=10.66.0.143171.220628-0056#@c3.ai/resource/subscriptions/104a6008-a4b5-446d-ae4c-f69bbd657c13/resourceGroups/CORPAZRESOURCEGROUP/providers/Microsoft.Compute/virtualMachines/Win10-ITREQ21966] or the IP address. 

```

mdaTrajectory Auth Token:

```
303372246dfb330d7925e7456e943f5a6438dd294abe8c28e194b66617704eb335051eeb744f6dfef0ed99b7befdf39f2f2fdf8b464f5c8b13799b13391fb185a34a
```

Sample Tickets:

![](Pasted%20image%2020220803145714.png)

VM Specs:

```json

{
    "name": "Win10-ITREQ21966",
    "id": "/subscriptions/104a6008-a4b5-446d-ae4c-f69bbd657c13/resourceGroups/corpAzResourceGroup/providers/Microsoft.Compute/virtualMachines/Win10-ITREQ21966",
    "type": "Microsoft.Compute/virtualMachines",
    "location": "westus2",
    "tags": {
        "createdBy": "CorpIT",
        "IT-Assignment": "ITREQ21966",
        "Name": "Kevin Eveker"
    },
    "identity": {
        "type": "SystemAssigned",
        "principalId": "77808dac-2a20-4008-9ef1-f3af7a594147",
        "tenantId": "53ad779a-93e7-485c-ba20-ac8290d7252b"
    },
    "properties": {
        "vmId": "b045feb0-4d2b-405b-8f89-85fad1c704ab",
        "hardwareProfile": {
            "vmSize": "Standard_E8s_v3"
        },
        "storageProfile": {
            "imageReference": {
                "publisher": "MicrosoftWindowsDesktop",
                "offer": "Windows-10",
                "sku": "win10-21h2-pro-g2",
                "version": "latest"
            },
            "osDisk": {
                "osType": "Windows",
                "name": "Win10-ITREQ21966_OsDisk_1_8249ec626716459d9aa9d89bc1f8f13e",
                "createOption": "FromImage",
                "caching": "ReadWrite",
                "managedDisk": {
                    "storageAccountType": "Premium_LRS",
                    "id": "/subscriptions/104a6008-a4b5-446d-ae4c-f69bbd657c13/resourceGroups/CORPAZRESOURCEGROUP/providers/Microsoft.Compute/disks/Win10-ITREQ21966_OsDisk_1_8249ec626716459d9aa9d89bc1f8f13e"
                },
                "diskSizeGB": 127
            },
            "dataDisks": []
        },
        "osProfile": {
            "computerName": "Win10-ITREQ2196",
            "adminUsername": "C3Admin",
            "windowsConfiguration": {
                "provisionVMAgent": true,
                "enableAutomaticUpdates": true
            },
            "secrets": []
        },
        "networkProfile": {
            "networkInterfaces": [
                {
                    "id": "/subscriptions/104a6008-a4b5-446d-ae4c-f69bbd657c13/resourceGroups/corpAzResourceGroup/providers/Microsoft.Network/networkInterfaces/win10-itreq21966989_z1",
                    "properties": {
                        "deleteOption": "Delete"
                    }
                }
            ]
        },
        "diagnosticsProfile": {
            "bootDiagnostics": {
                "enabled": true
            }
        },
        "licenseType": "Windows_Client",
        "provisioningState": "Succeeded"
    },
    "zones": [
        "1"
    ],
    "resources": [
        {
            "name": "AADLoginForWindows",
            "id": "/subscriptions/104a6008-a4b5-446d-ae4c-f69bbd657c13/resourceGroups/corpAzResourceGroup/providers/Microsoft.Compute/virtualMachines/Win10-ITREQ21966/extensions/AADLoginForWindows",
            "type": "Microsoft.Compute/virtualMachines/extensions",
            "location": "westus2",
            "tags": {
                "createdBy": "CorpIT",
                "IT-Assignment": "ITREQ21966",
                "Name": "Kevin Eveker"
            },
            "properties": {
                "autoUpgradeMinorVersion": true,
                "provisioningState": "Succeeded",
                "publisher": "Microsoft.Azure.ActiveDirectory",
                "type": "AADLoginForWindows",
                "typeHandlerVersion": "1.0",
                "settings": {
                    "mdmId": ""
                }
            }
        }
    ]
}

```

#### Regrah API
Your ReGraph & KronoGraph login details

Hi Luis,

You now have access to the ReGraph and KronoGraph production sites:

-   [ReGraph.io](https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fregraph.io%2F&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C47987e34c3664cf34e7a08da6b1473bf%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637940032846331451%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C2000%7C%7C%7C&sdata=35vWSnQ2BddRD6oFN4XkIVYffAzLOj%2BkYRjhQG%2Bau3w%3D&reserved=0 "https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fregraph.io%2F&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C47987e34c3664cf34e7a08da6b1473bf%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637940032846331451%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C2000%7C%7C%7C&sdata=35vWSnQ2BddRD6oFN4XkIVYffAzLOj%2BkYRjhQG%2Bau3w%3D&reserved=0")
-   [KronoGraph.io](https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fkronograph.io%2F&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C47987e34c3664cf34e7a08da6b1473bf%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637940032846331451%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C2000%7C%7C%7C&sdata=Jdnv3XXfxuw4aVzlV1yi5u4K3MFZXgv37%2BCJel0dsXY%3D&reserved=0 "https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fkronograph.io%2F&data=05%7C01%7Cluis.fernandez-de-la-vara%40c3.ai%7C47987e34c3664cf34e7a08da6b1473bf%7C53ad779a93e7485cba20ac8290d7252b%7C1%7C0%7C637940032846331451%7CUnknown%7CTWFpbGZsb3d8eyJWIjoiMC4wLjAwMDAiLCJQIjoiV2luMzIiLCJBTiI6Ik1haWwiLCJXVCI6Mn0%3D%7C2000%7C%7C%7C&sdata=Jdnv3XXfxuw4aVzlV1yi5u4K3MFZXgv37%2BCJel0dsXY%3D&reserved=0")

To access either, you’ll need a Google, GitHub or GitLab account, or be able to receive e-mail using your [luis.fernandez-de-la-vara@c3.ai](mailto:luis.fernandez-de-la-vara@c3.ai "mailto:luis.fernandez-de-la-vara@c3.ai") email address.

Your subscription accounts will expire on September 22, 2024.

Under the terms of the legal arrangements between Cambridge Intelligence and C3.ai, Inc. the use of ReGraph and KronoGraph are restricted to the development of C3 AI Data Vision, CRM, Ex Machina, Anti-Money Laundering, Suite. You should not use ReGraph or KronoGraph for any other purpose.

If you have any questions or problems, our support teams would be happy to help:

-   [help@regraph.io](mailto:help@regraph.io "mailto:help@regraph.io")
-   [help@kronograph.io](mailto:help@kronograph.io "mailto:help@kronograph.io")

We respond to issues as soon as we can, so don't hesitate to raise anything.

All the best

Celine Ramond  
[celine.ramond@cambridge-intelligence.com](mailto:celine.ramond@cambridge-intelligence.com "mailto:celine.ramond@cambridge-intelligence.com")

#### Jupyter Environment Setup

- Create MDA Conda Env as described here (https://github.com/c3-e/c3fed-mda/blob/66904d24a6fa4045a2a2c834d46c9ab7bbacf3af/mda/mdaTrajectory/resources/V1.1_Data_Load/README.md)


```ad-note

# Populating V1.1 Data
## Pre-Steps
1. Install anaconda: https://docs.anaconda.com/anaconda/install/mac-os/ (make sure to allow anaconda access to the command line)

2. Install MDA.yaml from the command line with: `conda env create -f MDA.yaml`

3. Activate conda: `conda activate MDA`

## Steps

1. Download pre-trained models and data from https://c3gov.app.box.com/folder/154094766278 and unzip App_Data.zip all within V1.1_Data_Load folder.

2. Run: `python3 ir_demo.py --load-data`

3. You will be prompted to log into your local copy of C3

```


### GIT BRANCH AND REPO POLICY


```ad-note
Develop is the main branch

Master is develop w/ 2 lines of changes for the classification level (SECRET//NOFORN//FRD)

Do whatever you want in your feature/topic/etc branches

Squash & Merge always; every commit should be demo-able. (Squash & Merge is the only option no GitHub ![😉]
(https://statics.teams.cdn.office.net/evergreen-assets/personal-expressions/v1/assets/emoticons/wink/default/20_f.png "Wink"))

`master`== classified

`develop` == main branch

`feature/initials/TICKETNUMBER_whatever_description_after` <-- major branches worth serious review  

`topic/initials/...` <-- minor changes not worth super-serious review, like adjusting seed data or CSS

`hotfix/initials/...` <--- self-explanatory

`docs/initials/...` <--- self-explanatory

`ugprade/initials/...` <--- c3server/base version upgrades

-----
```

```ad-note
## Git Branch Strategy
git checkout develop  
git pull  
git checkout -b feature/lefv/MDA-1004-redux  
# copy/paste mdaUserManagement folder from my branch in  
git commit -m "copy/paste of Jared's mdaUserManagement dir"  
# look through your current PR and see what other files changed  
# manually apply those changes  
git commit -m "manually applied additional diffs"  
git push --set-upstream origin feature/lefv/MDA-1004-redux  
# provision & start bundling  
# open PR while doing that  
# verify stuff works  
# then label PR as ready for review & tag reviewers
```

2022-06-20T11:32:39-04:00
#### File Naming Conventions
This half-breaks our convention of `XYZEpic` for custom logic o r `UiSdlEpicXYZ` for things meant to be "Component Library"

#### Release Arg

### DEPLOYMENT
-   prod in HSV + DS-lab in VA are airgapped.  
    
-   Stage has IDS but it's being gutted in v7 and not worth the effort.  
    
    -   MDA has no CI/CD mechanism until their Azure Cloud is up.
        
        -   So... no CI/CD until 2023 most likely unless we get to v8 early and set it up on the stage env
            

#### CompSec Staging Area
https://featuresclera-sclera.stagetitan.c3ai.cloud/

#### mdaTrajectory Staging Area

https://mdatrajectory-stage.c3.ai/

### mdaPTS Staging Area
https://parametricthreat-stage.c3.ai/static/console/

### GTD Staging

[**https://groundtest-datalake.c3.ai**](https://groundtest-datalake.c3.ai/ "https://groundtest-datalake.c3.ai")


[https://groundtest-datalake-qa.c3.ai/](https://groundtest-datalake-qa.c3.ai/ "https://groundtest-datalake-qa.c3.ai/")

2023-03-06-09:53

mda-pts-stage.stageeksmda.c3ai.cloud
mda-pts-qa.stageeksmda.c3ai.cloud
mda-pts-dev.stageeksmda.c3ai.cloud
mda-gto-stage.stageeksmda.c3ai.cloud
mda-gto-qa.stageeksmda.c3ai.cloud
mda-gto-dev.stageeksmda.c3ai.cloud
mda-ftd-dev.stageeksmda.c3ai.cloud
mda-tgm-dev.stageeksmda.c3ai.cloud

#### Creating Offline Bundles
[Collecting Offline Bundles - Federal Engineering - Confluence (atlassian.net)](https://c3energy.atlassian.net/wiki/spaces/FE/pages/7998636180/Collecting+Offline+Bundles)**

## Monitoring

https://stage-mda-kibana.c3-e.com/kibana/login?next=%2Fkibana%2Fapp%2Fhome

[Example Monitor](https://stage-mda-kibana.c3-e.com/kibana/app/lens#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-24h%2Fh,to:now)))

#### Vanity URL Deployment

[2:02 PM] Jared Morris

FYSA we _do_ have a 7.30 PTS vanityUrl space we can provision to on AWS

  

[2:03 PM] Jared Morris

PTS - [https://parametricthreat-stage.c3.ai/static/console](https://parametricthreat-stage.c3.ai/static/console "https://parametricthreat-stage.c3.ai/static/console")  

TGM - [https://mdatrajectory-stage.c3.ai/static/console](https://mdatrajectory-stage.c3.ai/static/console "https://mdatrajectory-stage.c3.ai/static/console")


### UI

#### FIGMA MDA

~~`https://www.figma.com/file/F9iaaRoFOjSxDTb81EiWLz/MDA?node-id=1050%3A18358`~~

2022-05-23T10:55:39-04:00
https://www.figma.com/file/F9iaaRoFOjSxDTb81EiWLz/MDA?node-id=1050%3A18358

#### UI Resource Process
As a general rule, we route UX stuff through Mike who files a UXRR board Jira ticket (UX Resource Request) .Bus then looks at it like ops-triage or services-management does, assigns to JasonJason does actual staffing.If we get no movement, Mike pokes on Jira.  Otherwise I bring it up in the Dan Crowley meeting and get Kevin/Dan to say "poke again, and we'll poke X person from the side."  That's how I finally got UXRR staffed for PTS after 3 months.

#### UI Resources
[[1-800-Flowers] Top-Down Data Vision Improvements by c3-jmorris · Pull Request #1908 · c3-e/c3trial (github.com)](https://github.com/c3-e/c3trial/pull/1908/files)****


#### UI Refactor
2022-05-16

```ad-note

[9:44 AM] Jared Morris

UI Refactor is pretty big since it's move + rename + rename in tests + rename in triggers

  

[https://github.com/c3-e/c3fed-mda/pull/488/files](https://github.com/c3-e/c3fed-mda/pull/488/files "https://github.com/c3-e/c3fed-mda/pull/488/files")  

[](https://github.com/c3-e/c3fed-mda/pull/488/files "https://github.com/c3-e/c3fed-mda/pull/488/files")  

==Review== process I think I'll just go through the whole app workflow and screenshot every view


[9:45 AM] Jared Morris

The diff is harder than the actual refactor

  
1.  ==move== common file to `mdaUiLib`
    
2.  ==Rename== `TGM.MyComponent` to `mdaUiLib.MyComponent`
    
3. ==Global FInd/Replace== `TGM.MyComponent` with `mdaUiLibMyComponent`
    
4.  ==Move and rename== `Translation` entries in `seed/Translation/en.csv` from one to the other
    

  

[9:46 AM] Jared Morris

I'll be at the office in ~15min

```

### TESTING
```ad-note 

<h1>Test</h1>
Demo env has real data for proper demos (unclassified)
        
Local demo data is curated to show all elements of UI and expose visual bugs constantly

```

### Charge Codes

PTS Trial for all things TGM/PTS, including things shared across PTS/FlightTest.

Flight Test only for _flightTest-specific_ work (like your PR) or Cloud/IATT meetings (Microsoft & Jacobs Engineering)

  

-- That would include if you do any work with Mason about Azure/not-quite-airgapped deployments. The IATT/Cloud Azure IL6 trial is separate order but is "Flight Test" despite its separate line item.

## CONTRACTORS
### EMAIL CACHE:

```
Jacob Dawson - jacob.dawson@paradyme.us [jacob.dawson@paradyme.us](mailto:jacob.dawson@paradyme.us)

Brandy Youngson - brandy.youngson@paradyme.us [brandy.youngson@paradyme.us](mailto:brandy.youngson@paradyme.us)

Kosei Matsuda - kosei.matsuda@paradyme.us [kosei.matsuda@paradyme.us](mailto:kosei.matsuda@paradyme.us)

Aaron Dixon - Aaron Dixon [aaron.dixon@paradyme.us](mailto:aaron.dixon@paradyme.us)

```

## Dev Onboarding

Contractor Setup:

#### c3Okta Credentials

```ad-note
-   kosei.matsuda-c@c3.ai
    
-   brandy.youngson-c@c3.ai
-   jacob.dawson-c@c3.ai
- aaron.dixon-c@c3.ai
```



#### VPN Credentials 
([https://c3e-my.sharepoint.com/personal/sharedfolders_c3iot_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fsharedfolders%5Fc3iot%5Fcom%2FDocuments%2FIT%2FSoftware%2FVPN&ct=1657818975929&or=Teams%2DHL&ga=1](https://c3e-my.sharepoint.com/personal/sharedfolders_c3iot_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fsharedfolders%5Fc3iot%5Fcom%2FDocuments%2FIT%2FSoftware%2FVPN&ct=1657818975929&or=Teams%2DHL&ga=1)) 

  

#### System Specs:

- System Specs: 8cpu, 64G RAM

- Set up WSL2: [https://docs.microsoft.com/en-us/windows/wsl/install-manual#step-4---download-the-linux-kernel-update-package](https://docs.microsoft.com/en-us/windows/wsl/install-manual#step-4---download-the-linux-kernel-update-package)

#### Debian Setup

Install and Configure Debian: 

install node: `sudo apt-get nodejs`
install zip unzip: `sudo apt-get install zip unzip`

install git: `sudo apt-get install git`

install nvm: `sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash`

set node verison: 
`nvim install 14.17.6`
`nvim use 14.17.6`

create sim link to windows local profile:

`ln -s /mnt/c/Users/{Username} Username` 
`ln -s /mnt/c/Users/{Username}/Downloads Username_Downloads`
`ln -s  /mnt/c/Users/{Username}/Desktop Username_Desktop`

create c3 directory:

`mkdir ~/c3`

add the following to your `/etc/hosts` file:

`sudo vi /etc/hosts`

```ad-note
...
127.0.0.1       mdapts
127.0.0.1       mdaftd
127.0.0.1       wildcard
...
```


### Git and Repo Access

```

Git Installation

[https://github.com/git-for-windows/git/releases/download/v2.37.1.windows.1/Git-2.37.1-64-bit.exe](https://github.com/git-for-windows/git/releases/download/v2.37.1.windows.1/Git-2.37.1-64-bit.exe)

Defaults except:

checkout as-is, commit unix style endings

generate ssh key:

[https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

in git bash: ssh-keygen -t ed25519 -C “first.last@c3.ai"

accept defaults

no password

repeat for debian:

adding your ssh key to the ssh-agent

once key added — > configure SSO and sign in


get github access 

[https://c3energy.atlassian.net/browse/OP-28673](https://c3energy.atlassian.net/browse/OP-28673)

perform for windows and debian


setup git lfs

[https://git-lfs.github.com/](https://git-lfs.github.com/)

git lfs install Git LFS initialized

  

configure git long path

git config --system core.longpaths true

  

Testing GIt and creating c3 File Structure

In your home folder: C:\Users\<username> create a directory called ‘c3’

  

note: all c3 repos should go in this directory

go to this directory
```


### Windows Setup

==Optional==:

	Install ps7
	
	[https://github.com/PowerShell/PowerShell/releases/tag/v7.2.5](https://github.com/PowerShell/PowerShell/releases/tag/v7.2.5)
	
	[https://github.com/PowerShell/PowerShell/releases/download/v7.2.5/PowerShell-7.2.5-win-x86.msi](https://github.com/PowerShell/PowerShell/releases/download/v7.2.5/PowerShell-7.2.5-win-x86.msi)

==Optional==:

[Install windows terminal ](https://docs.microsoft.com/en-us/windows/terminal/install)

### Docker

- accept defaults

- Install Docker:[https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)

- Restart host

- integrate debian wsl2 environment into docker —> settings | resources | wsl integration | check enable integration with default image and toggle debian on

![](Pasted%20image%2020220718112242.png)

*==in windows==*:

[Download Docker Images and Compose from MDA Contractors Box Folder]([MDA Contractors | Powered by Box](https://c3gov.app.box.com/folder/167742161931))

*==in debian==*:

`docker load -i $(container name)` 

example: `docker load -i c3server.tar`

copy over docker compose files -- note you can copy into whichever directory you may prefer. 

`cp ~/Username_Downloads/c3-7.30-mda-contractors.zip ~/c3/`

unzip docker compose files into target directory (any is ok)

`unzip ~/c3/c3-7.30-mda-contractors.zip`


### C3 Server

Move to unzip docker-compose directory:

`cd ~/c3/c3-7.30-patch`

initialize c3 server: 

`docker-compose up -d c3server cassandra postgres`

if you wish to view the output of your docker containers:

`check Docker app` or `docker exec -it dev-c3server`

test c3 server up:

`curl -i localhost:8080`

### C3 CLI Install 

Install c3 cli (from within debian):

```
mkdir -p ~/cli && curl http://BA:BA@localhost:8080/static/nodejs-apps/cli/cli.tar.gz | tar xvz -C ~/cli   
cd ~/cli
./c3 install

alias ‘c3’ in bash profile `alias c3=~/cli/c3`

test: c3 prov help -u BA:BA

```

### PROVISION 

create provision target directory:

`mkdir ~/c3/prov_mda`

add a sim link from mda repo to provision directory:

`cd ~/c3/prov_mda`

`ln -s ~/c3/fed3-mda/mda/`

add provision command to ~/.bashrc:

```

alias prov-mda-pts='c3 prov tag -t mdaPTS:dev -c mdaPTS -u BA:BA -a ~/c3/prov_mda -E -S'


```

refresh ~/.bashrc

`source ~/.bashrc`

test provision:

`prov-mda-pts`

result:

![](Pasted%20image%2020220718144209.png)


### Set VanityURL for Bundling

go to `localhost:8080/static/console` in Browser

force refresh: `cmd + shift + r`

switch tenant/tag to `mdaPTS/dev`

open up browser debug console: `ctrl + shift + j`

execute the following in the command window:

```

let vurl = (addr, webpack = true) => {
  var context = c3Context();
  VanityUrl.create({
    id: addr || "localhost",
    name: addr || "localhost",
    tenant: context.tenant,
    tag: context.tag,
    defaultContent: webpack ? 'c3/index.html' : 'index.html'
  });
}
// switch to tenant/tag you want
vurl()
vurl('wildcard')
vurl('mdapts')

```

test by refreshing browser window: `ctrl + shift + r` // localhost:8080/static/console should now redirect only to `tenant/tag`

### C3 UI CLI 
==note==: additional to 'C3 CLI'

```

// Authenticate a key for your application
c3 key -e http://mdapts:8080
//username: BA psswd: BA

// Install c3 ui CLI
c3 ui install -e http://mdapts:8080 -u BA:BA

// Add a bundler alias to your ~/.bashrc
alias bund-mda-pts='c3 ui -W ~/c3/uiWorkingDir/mda-pts --log-dir ~/c3/c3log/mdaPTS -e http://mdapts:8080 -t mdaPTS:dev -a ~/c3/c3fed-mda/mda -u BA:BA'

// refresh ~/.bashrc
source ~/.bashrc

// create ui debug directories
mkdir -p ~/c3/uiWorkingDir/mda-pts
mkdir -p ~/c3/c3log/mdaPTS

// Start the bundler
bund-mda-pts

// Launch your application in http://localhost:50081 once bundler is done.

```


**4. IDE**

4.1 Visual Studio Code

VSCode (Visual Studio Code) is the recommended IDE for development and its use is highly encouraged since it is being used by a majority of Apps engineers. You can download it [here](https://code.visualstudio.com/download).

There are some helpful Visual Studio Code extensions that are recommended if you are developing on VS Code:

• C3-VSCode

• You can install the plugin from the vscode marketplace [https://marketplace.visualstudio.com/items?itemName=C3ai.c3-ai-dx](https://marketplace.visualstudio.com/items?itemName=C3ai.c3-ai-dx)

• [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

