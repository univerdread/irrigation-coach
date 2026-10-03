# Voice clip bank (~60 clips)

The app stitches recorded clips into one sentence, e.g. *Washa pampu kwa* + *saa* + *nne* + *na dakika* + *kumi* + *leo*. Because the UI rounds pump time to 5 minutes (DECISIONS D14), minutes need only 11 clips.

**Status:** English is the source. **Every Kiswahili line is a draft and must be checked and recorded by a native speaker.** If no speaker is found in time, say so in the pitch and use device text-to-speech as a labelled fallback (the app's Play button already does this).

Recording: quiet room, phone voice memo, one file per clip, 16 kHz+ mono, trimmed, named by ID (`app/public/voice/sw/num_4.ogg`). Note: in Kiswahili "saa nne" can also be a clock time (10 a.m. in Swahili time); "kwa saa nne" (for four hours) is the duration form. Have the speaker confirm it reads as a duration.

## Sentence frames

| ID | English | Kiswahili (draft) |
|---|---|---|
| frame_run | Run the pump for | Washa pampu kwa |
| frame_today | today | leo |
| frame_tomorrow_morning | tomorrow morning | kesho asubuhi |
| frame_no_pump | No pumping needed today. | Hakuna haja ya kuwasha pampu leo. |
| frame_paused | No minutes yet: first a question. | Bado hakuna dakika: kwanza swali. |
| frame_and | and | na |
| unit_hours | hours | saa |
| unit_minutes | minutes | dakika |
| unit_litres | litres | lita |
| unit_mm | millimetres | milimita |

## Numbers

Hours 1–12 and minutes 5–55 in steps of 5.

| ID | English | Kiswahili (draft) |
|---|---|---|
| num_1 | one | moja |
| num_2 | two | mbili |
| num_3 | three | tatu |
| num_4 | four | nne |
| num_5 | five | tano |
| num_6 | six | sita |
| num_7 | seven | saba |
| num_8 | eight | nane |
| num_9 | nine | tisa |
| num_10 | ten | kumi |
| num_11 | eleven | kumi na moja |
| num_12 | twelve | kumi na mbili |
| num_15 | fifteen | kumi na tano |
| num_20 | twenty | ishirini |
| num_25 | twenty-five | ishirini na tano |
| num_30 | thirty | thelathini |
| num_35 | thirty-five | thelathini na tano |
| num_40 | forty | arobaini |
| num_45 | forty-five | arobaini na tano |
| num_50 | fifty | hamsini |
| num_55 | fifty-five | hamsini na tano |
| num_over_12 | more than twelve | zaidi ya kumi na mbili |

## Weekdays

| ID | English | Kiswahili (draft) |
|---|---|---|
| day_mon | Monday | Jumatatu |
| day_tue | Tuesday | Jumanne |
| day_wed | Wednesday | Jumatano |
| day_thu | Thursday | Alhamisi |
| day_fri | Friday | Ijumaa |
| day_sat | Saturday | Jumamosi |
| day_sun | Sunday | Jumapili |

## Questions (one per missing input)

| ID | English | Kiswahili (draft) |
|---|---|---|
| q_rain | How much rain fell? Read the water in your container. | Mvua kiasi gani ilinyesha? Soma maji kwenye chombo chako. |
| q_bucket | Time how long the pump takes to fill a 20-litre bucket. | Pima muda pampu inachukua kujaza ndoo ya lita ishirini. |
| q_soil_check | Dig a handful of soil at root depth and check it. | Chimba konzi ya udongo kwenye kina cha mizizi na uikague. |
| q_second_check | Please check the soil once more. | Tafadhali kagua udongo tena. |
| q_ribbon | Squeeze moist soil into a ribbon. | Finyanga udongo wenye unyevu kuwa utepe. |
| q_crop | What is growing, and how old is it? | Umepanda nini, na kina umri gani? |
| q_method | How do you water: furrows, sprinkler or drip? | Unamwagilia vipi: mifereji, kinyunyizio au matone? |
| q_officer | Please ask your extension officer to look at the plot. | Tafadhali mwombe afisa wa ugani akague shamba. |

## Short replies and reasons

| ID | English | Kiswahili (draft) |
|---|---|---|
| r_soil_ok | The soil still holds enough water. | Udongo bado una maji ya kutosha. |
| r_full | The root zone is full. | Udongo wa mizizi umejaa maji. |
| r_rain_counted | Rain has been counted. | Mvua imehesabiwa. |
| r_logged | Saved. | Imehifadhiwa. |
| r_salty | The water may be salty. Get a water test. | Maji yanaweza kuwa na chumvi. Pima maji. |
| r_slope | Run furrows along the slope's contour. | Chimba mifereji kufuata kontua. |
| r_clay | Water in shorter, more frequent sets. | Mwagilia kwa muda mfupi mara nyingi zaidi. |
| r_unsure | I am not sure today. | Leo sina uhakika. |
| btn_done | Done | Nimemaliza |
| btn_skipped | Skipped | Sikuwasha |
| btn_no_rain | No rain | Hakuna mvua |
| btn_dont_know | Don't know | Sijui |

Count: 10 frames + 22 numbers + 7 weekdays + 8 questions + 12 replies = **59 clips**.
