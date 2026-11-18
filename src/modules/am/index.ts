/**
 * Amplitude & Angle Modulation Modules: 2.1 to 2.7
 */

import { Module2_1_CAM } from './Module2_1_CAM';
import { Module2_2_DSBSC } from './Module2_2_DSBSC';
import { Module2_3_SSB } from './Module2_3_SSB';
import { Module2_4_VSB } from './Module2_4_VSB';
import { Module2_5_FM } from './Module2_5_FM';
import { Module2_6_AM_PM } from './Module2_6_AM_PM';
import { Module2_7_Demodulation } from './Module2_7_Demodulation';

export {
  Module2_1_CAM,
  Module2_2_DSBSC,
  Module2_3_SSB,
  Module2_4_VSB,
  Module2_5_FM,
  Module2_6_AM_PM,
  Module2_7_Demodulation,
};

export const AM_MODULE_COMPONENTS = {
  'cam': Module2_1_CAM,
  '2.1': Module2_1_CAM,
  '01': Module2_1_CAM,
  'dsb-sc': Module2_2_DSBSC,
  '2.2': Module2_2_DSBSC,
  '02': Module2_2_DSBSC,
  'ssb': Module2_3_SSB,
  '2.3': Module2_3_SSB,
  '03': Module2_3_SSB,
  'vsb': Module2_4_VSB,
  '2.4': Module2_4_VSB,
  '04': Module2_4_VSB,
  'fm': Module2_5_FM,
  '2.5': Module2_5_FM,
  '05': Module2_5_FM,
  'am-pm': Module2_6_AM_PM,
  'pm': Module2_6_AM_PM,
  '2.6': Module2_6_AM_PM,
  '06': Module2_6_AM_PM,
  'demodulation': Module2_7_Demodulation,
  '2.7': Module2_7_Demodulation,
  '07': Module2_7_Demodulation,
};
