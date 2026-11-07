import type { AppLocale } from '~/types/locale';
import { intlTagFor, toAppLocale } from '~/utils/format';

export const useAppLocale = (): {
  appLocale: ComputedRef<AppLocale>;
  intlTag: ComputedRef<string>;
} => {
  const { locale } = useI18n();
  const appLocale = computed<AppLocale>(() => toAppLocale(locale.value));
  const intlTag = computed(() => intlTagFor(appLocale.value));
  return { appLocale, intlTag };
};
