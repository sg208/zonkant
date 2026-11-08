interface PageHeadKeys {
  titleKey: string;
  descriptionKey: string;
}

export const usePageHead = ({
  titleKey,
  descriptionKey,
}: PageHeadKeys): void => {
  const { t } = useI18n();

  useHead({
    title: computed(() => `${t(titleKey)} - Zonkant`),
    meta: [{ name: 'description', content: computed(() => t(descriptionKey)) }],
  });
};
