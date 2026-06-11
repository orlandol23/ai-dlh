import { z } from 'zod';
import { zodI18nMap } from 'zod-i18n-map';
import './index';

z.setErrorMap(zodI18nMap);
