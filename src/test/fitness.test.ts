import { describe, expect, it } from "vitest";
import { aggregatePeriod, buildLatestExerciseComparisons, buildPerformanceSummary, buildPersonalBestAchievements, convertWeight, estimateOneRepMax, percentageChange, setVolume, workoutVolume } from "@/lib/fitness";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({ id:"set-1",setNumber:1,weight:100,repetitions:10,completed:true,type:"working",...overrides });
const workout: WorkoutSession = { id:"workout-1",title:"Test",performedAt:"2026-10-12T12:00:00.000Z",completedAt:"2026-10-12T13:00:00.000Z",status:"completed",createdAt:"2026-10-12T12:00:00.000Z",updatedAt:"2026-10-12T13:00:00.000Z",exercises:[{id:"exercise-1",name:"Bench Press",muscleGroup:"Chest",sets:[set(),set({id:"warmup",type:"warmup",weight:50})]}] };

describe("fitness calculations",()=>{
  it("converts between kilograms and pounds",()=>{expect(convertWeight(100,"kg","lb")).toBeCloseTo(220.462,2);expect(convertWeight(220.462,"lb","kg")).toBeCloseTo(100,2)});
  it("excludes warm-up and incomplete sets from volume",()=>{expect(setVolume(set())).toBe(1000);expect(setVolume(set({type:"warmup"}))).toBe(0);expect(setVolume(set({completed:false}))).toBe(0)});
  it("calculates workout working volume",()=>expect(workoutVolume(workout)).toBe(1000));
  it("uses the Epley estimated one rep max",()=>expect(estimateOneRepMax(100,10)).toBeCloseTo(133.33,2));
  it("rejects unsupported repetition ranges",()=>expect(estimateOneRepMax(100,31)).toBeNull());
  it("does not manufacture percentage changes from zero",()=>{expect(percentageChange(10,0)).toBeNull();expect(percentageChange(120,100)).toBe(20)});
  it("aggregates only completed workouts",()=>{const result=aggregatePeriod([workout,{...workout,id:"draft",status:"draft"}]);expect(result).toMatchObject({workouts:1,daysTrained:1,sets:1,repetitions:10,volume:1000,exerciseCount:1})});
  it("produces a truthful empty-period summary",()=>expect(buildPerformanceSummary(aggregatePeriod([]))).toContain("No completed workouts"));
  it("compares the latest exercise weight with its previous occurrence",()=>{const newer={...workout,id:"newer",performedAt:"2026-10-13T12:00:00.000Z",exercises:[{...workout.exercises[0],sets:[set({weight:110})]}]};expect(buildLatestExerciseComparisons([workout,newer])[0]).toMatchObject({exerciseName:"Bench Press",currentWeight:110,previousWeight:100,difference:10,direction:"increase"})});
  it("creates a weight achievement only when a previous exercise best is exceeded",()=>{const baseline={...workout,exercises:[{...workout.exercises[0],sets:[set({weight:50})]}]};const personalBest={...workout,id:"pb",performedAt:"2026-10-13T12:00:00.000Z",exercises:[{...workout.exercises[0],id:"exercise-pb",sets:[set({weight:55})]}]};const decline={...workout,id:"decline",performedAt:"2026-10-14T12:00:00.000Z",exercises:[{...workout.exercises[0],id:"exercise-decline",sets:[set({weight:52})]}]};const weights=buildPersonalBestAchievements([baseline,personalBest,decline]).filter(item=>item.kind==="weight");expect(weights).toHaveLength(1);expect(weights[0]).toMatchObject({currentWeight:55,previousWeight:50,improvement:5,repetitions:10})});
});
