## Current Status
![[Pasted image 20220404104240.png]]

Scenario Management & 
https://c3energy.atlassian.net/browse/SPLY-2158

- spec: https://c3e-my.sharepoint.com/:w:/g/personal/sharedfolders_c3iot_com/EXZxToMOPz5ErLdoZpyJR5QB64CdWBz_T3IcLP97fNuDsQ?e=m8GdXZ
- 

PSO Alerts
https://c3energy.atlassian.net/browse/SPLY-2093

Hi all,

If you'd like to get a quick context (before this afternoon's meeting) on what you will be working on, feel free to go through below three features and their spec/figmas.

1.  Scenario Management: [https://c3energy.atlassian.net/browse/SPLY-2158](https://c3energy.atlassian.net/browse/SPLY-2158 "https://c3energy.atlassian.net/browse/sply-2158")
    
2.  PSO Alerts: [https://c3energy.atlassian.net/browse/SPLY-2093](https://c3energy.atlassian.net/browse/SPLY-2093 "https://c3energy.atlassian.net/browse/sply-2093")
    
3.  Global Filtering (small feature / likely just one ticket): [https://c3energy.atlassian.net/browse/SPLY-2089](https://c3energy.atlassian.net/browse/SPLY-2089 "https://c3energy.atlassian.net/browse/sply-2089")  
    

For any spec/figmas related questions, you can also reach out directly to: Adrian Rami Francesco Zerbato JC Hu as well as Brett Thompson on the above.

## Dummy Data

PsoTest.loadTestData(false, 3)

## Figma
https://www.figma.com/file/6wfykkDGQNKVb0xJ6MBG5T/Update-for-4%2F30?node-id=0%3A1


## Path to Application
productionScheduleOptimization/PsoFacility/facility-master-plan-schedule

## Entry point to date validation:

?ProductionScheduleOptimization.FacilityGlobalFilterValue=PsoFacility

Save Form: UpdateScenarioAttributesBasicInfoEpic

Generate Plan: RunOptimizationAlgorithmEpic

## Functions to Test
Build PsoInput

Build PsoOutput

this.psoScenario = TestApi.upsertEntity(this.ctx, 'PsoScenario', {

id: 'scenario1',

name: 'PSO Scenario 1',

facility: 'fac1',

basePlan: 'psoPlan1',

startDate: this.now,

endDate: this.now,

scenarioDescription: 'This is a short description of this scenario',

});

this.ctx, 'PsoScenario',

[11:24 AM] Grant Roberts

this.ctx, 'PsoScenario',

  

[11:24 AM] Grant Roberts

sequencingEndDate = whatever end date is

createScenarioFromPlan