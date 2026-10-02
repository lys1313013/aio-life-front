/** 自动生成：运行 scripts/generate-api-contracts.py；ID 为字符串，显式 null 保留清空语义。 */
export interface AnniversaryRecordCreateReq {
  title?: null | string;
  targetDate?: null | string;
  type?: null | string;
  note?: null | string;
  color?: null | string;
  icon?: null | string;
}

export interface AnniversaryRecordUpdateReq {
  id?: null | string;
  title?: null | string;
  targetDate?: null | string;
  type?: null | string;
  note?: null | string;
  color?: null | string;
  icon?: null | string;
}

export interface ApiKeyGenerateReq {
  remark?: null | string;
  expireDays?: null | number;
}

export interface BVideoCreateReq {
  title?: null | string;
  url?: null | string;
  cover?: null | string;
  duration?: null | number;
  watchedDuration?: null | number;
  episodes?: null | number;
  currentEpisode?: null | number;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  notes?: null | string;
  bvid?: null | string;
  aid?: null | string;
  description?: null | string;
  ownerName?: null | string;
  pagesInfo?: null | string;
}

export interface BVideoProgressReq {
  title?: null | string;
  url?: null | string;
  cover?: null | string;
  duration?: null | number;
  watchedDuration?: null | number;
  episodes?: null | number;
  currentEpisode?: null | number;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  notes?: null | string;
  bvid?: null | string;
  aid?: null | string;
  description?: null | string;
  ownerName?: null | string;
  pagesInfo?: null | string;
}

export interface BVideoUpdateReq {
  title?: null | string;
  url?: null | string;
  cover?: null | string;
  duration?: null | number;
  watchedDuration?: null | number;
  episodes?: null | number;
  currentEpisode?: null | number;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  notes?: null | string;
  bvid?: null | string;
  aid?: null | string;
  description?: null | string;
  ownerName?: null | string;
  pagesInfo?: null | string;
}

export interface BankCardReq {
  bankId?: null | string;
  customBankName?: null | string;
  cardName?: null | string;
  alias?: null | string;
  cardType?: null | string;
  cardNo?: null | string;
  branchName?: null | string;
  status?: null | string;
  openedDate?: null | string;
  expiryMonth?: null | string;
  creditLimit?: null | number | string;
  statementDay?: null | number;
  repaymentDay?: null | number;
  coverColor?: null | string;
  coverSourceUrl?: null | string;
  sortOrder?: null | number;
  remark?: null | string;
  tagIds?: Array<string> | null;
  coverFileIds?: Array<string> | null;
}

export interface BankCardTagReq {
  name?: null | string;
  color?: null | string;
  status?: null | string;
}

export interface CbtiPersonalitySaveReq {
  code?: null | string;
  name?: null | string;
  motto?: null | string;
  color?: null | string;
  vector?: Array<number> | null;
  description?: null | string;
  strengths?: Array<string> | null;
  weaknesses?: Array<string> | null;
  techStack?: null | string;
  spirit?: null | string;
  imageObject?: null | string;
  isSpecial?: boolean | null;
}

export interface CbtiTestReq {
  answers?: null | Record<string, unknown>;
  hiddenAnswers?: null | Record<string, unknown>;
}

export interface ChangePasswordReq {
  oldPassword?: null | string;
  newPassword?: null | string;
}

export interface ChatReq {
  prompt?: null | string;
  conversationId?: null | string;
}

export interface ChatSessionSaveReq {
  title?: null | string;
}

export interface CommonReq {
  idList?: Array<string> | null;
}

export interface DeviceCreateReq {
  name?: null | string;
  spec?: null | string;
  type?: null | string;
  status?: null | string;
  remark?: null | string;
  purchaseDate?: null | string;
  purchasePrice?: null | number | string;
  purchasePlace?: null | string;
  fileId?: null | string;
  endDate?: null | string;
}

export interface DeviceUpdateReq {
  name?: null | string;
  spec?: null | string;
  type?: null | string;
  status?: null | string;
  remark?: null | string;
  purchaseDate?: null | string;
  purchasePrice?: null | number | string;
  purchasePlace?: null | string;
  fileId?: null | string;
  endDate?: null | string;
}

export interface DoubanMovieImportItemReq {
  rowNumber?: null | number;
  doubanSubjectId?: null | string;
  title?: null | string;
  type?: null | string;
  director?: null | string;
  url?: null | string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  markedDate?: null | string;
  rating?: null | number;
  remark?: null | string;
}

export interface DoubanMovieImportReq {
  format?: null | string;
  version?: null | number;
  source?: null | string;
  doubanUserId?: null | string;
  duplicatePolicy?: null | string;
  records?: Array<DoubanMovieImportItemReq> | null;
}

export interface ExerciseRecordCreateReq {
  exerciseTypeId?: null | string;
  exerciseDate?: null | string;
  exerciseCount?: null | number;
  description?: null | string;
}

export interface ExerciseRecordUpdateReq {
  exerciseTypeId?: null | string;
  exerciseDate?: null | string;
  exerciseCount?: null | number;
  description?: null | string;
}

export interface ExpenseCreateReq {
  transactionAmt?: null | number | string;
  amt?: null | number | string;
  expTypeId?: null | string;
  payTypeId?: null | string;
  counterparty?: null | string;
  counterpartyAcct?: null | string;
  remark?: null | string;
  expTime?: null | string;
  transactionId?: null | string;
  expDesc?: null | string;
  merchantOrderNo?: null | string;
  transactionStatus?: null | string;
}

export interface ExpenseUpdateReq {
  id?: null | string;
  transactionAmt?: null | number | string;
  amt?: null | number | string;
  expTypeId?: null | string;
  payTypeId?: null | string;
  counterparty?: null | string;
  counterpartyAcct?: null | string;
  remark?: null | string;
  expTime?: null | string;
  transactionId?: null | string;
  expDesc?: null | string;
  merchantOrderNo?: null | string;
  transactionStatus?: null | string;
}

export interface FeedbackBatchReq {
  idList?: Array<string> | null;
  action?: null | string;
}

export interface FeedbackCommentCreateReq {
  content?: null | string;
  fileIds?: Array<string> | null;
}

export interface FeedbackCreateReq {
  title?: null | string;
  content?: null | string;
  feedbackType?: null | string;
  priority?: null | string;
  fileIds?: Array<string> | null;
}

export interface FeedbackStatusUpdateReq {
  status?: null | string;
}

export interface FeishuChannelSaveReq {
  enabled?: boolean | null;
  appId?: null | string;
  appSecret?: null | string;
  openId?: null | string;
}

export interface GoalCreateReq {
  type?: null | number;
  title?: null | string;
  description?: null | string;
  content?: null | string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  targetValue?: null | number;
  currentValue?: null | number;
  year?: null | number;
  month?: null | number;
  day?: null | number;
  parentId?: null | string;
  startDate?: null | string;
  endDate?: null | string;
  tags?: null | string;
}

export interface GoalUpdateReq {
  id?: null | string;
  type?: null | number;
  title?: null | string;
  description?: null | string;
  content?: null | string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  targetValue?: null | number;
  currentValue?: null | number;
  year?: null | number;
  month?: null | number;
  day?: null | number;
  parentId?: null | string;
  startDate?: null | string;
  endDate?: null | string;
  tags?: null | string;
}

export interface HonorRecordCreateReq {
  title?: null | string;
  description?: null | string;
  honorDate?: null | string;
  issuer?: null | string;
  level?: null | string;
  categoryId?: null | string;
  customCategory?: null | string;
  tags?: null | string;
  isTop?: null | number;
  isPublic?: null | number;
  sortOrder?: null | number;
  fileIds?: Array<string> | null;
}

export interface HonorRecordUpdateReq {
  id?: null | string;
  title?: null | string;
  description?: null | string;
  honorDate?: null | string;
  issuer?: null | string;
  level?: null | string;
  categoryId?: null | string;
  customCategory?: null | string;
  tags?: null | string;
  isTop?: null | number;
  isPublic?: null | number;
  sortOrder?: null | number;
  fileIds?: Array<string> | null;
}

export interface IncomeCreateReq {
  amt?: null | number | string;
  incDate?: null | string;
  remark?: null | string;
  incTypeId?: null | string;
  tax?: null | number | string;
}

export interface IncomeUpdateReq {
  amt?: null | number | string;
  incDate?: null | string;
  remark?: null | string;
  incTypeId?: null | string;
  tax?: null | number | string;
}

export interface LLMKeyCreateReq {
  modelName?: null | string;
  apiKey?: null | string;
  baseUrl?: null | string;
  isDefault?: null | number;
}

export interface LLMKeyUpdateReq {
  id?: null | string;
  modelName?: null | string;
  apiKey?: null | string;
  baseUrl?: null | string;
  isDefault?: null | number;
}

export interface LoginReq {
  username?: null | string;
  password?: null | string;
}

export interface MbtiResultSaveReq {
  testId?: null | string;
  mbtiType?: null | string;
  resultsPage?: null | string;
  predictions?: null | unknown;
  traitOrderConscious?: null | unknown;
  traitOrderShadow?: null | unknown;
  matches?: null | unknown;
}

export interface MembershipCreateReq {
  name?: null | string;
  category?: null | string;
  provider?: null | string;
  icon?: null | string;
  color?: null | string;
  startDate?: null | string;
  expiryDate?: null | string;
  price?: null | number | string;
  billingCycle?: null | string;
  monthlyAmount?: null | number | string;
  autoRenew?: null | number;
  note?: null | string;
}

export interface MembershipReq {
  id?: null | string;
  name?: null | string;
  category?: null | string;
  provider?: null | string;
  icon?: null | string;
  color?: null | string;
  startDate?: null | string;
  expiryDate?: null | string;
  price?: null | number | string;
  billingCycle?: null | string;
  monthlyAmount?: null | number | string;
  autoRenew?: null | number;
  note?: null | string;
}

export interface MemoCreateReq {
  title?: null | string;
  content?: null | string;
  hiddenContent?: boolean | null;
}

export interface MemoUpdateReq {
  title?: null | string;
  content?: null | string;
  hiddenContent?: boolean | null;
}

export interface MenuSaveReq {
  parentId?: null | string;
  name?: null | string;
  path?: null | string;
  component?: null | string;
  redirect?: null | string;
  meta?: null | Record<string, unknown>;
  roles?: null | string;
  sort?: null | number;
  status?: null | number;
}

export interface MenuSortUpdateReq {
  sort?: null | number;
}

export interface MenuStatusUpdateReq {
  status?: null | number;
}

export interface MessageCreateReq {
  receiverId?: null | string;
  title?: null | string;
  content?: null | string;
  type?: null | number;
}

export interface MilestoneCreateReq {
  title?: null | string;
  description?: null | string;
  date?: null | string;
  end_date?: null | string;
  type?: null | string;
  tags?: null | string;
}

export interface MilestoneUpdateReq {
  id?: null | string;
  title?: null | string;
  description?: null | string;
  date?: null | string;
  end_date?: null | string;
  type?: null | string;
  tags?: null | string;
}

export interface MovieCreateReq {
  title?: null | string;
  type?: null | number;
  director?: null | string;
  url?: null | string;
  fileId?: null | string;
  coverImgUrl?: null | string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  totalProgress?: null | number;
  currentProgress?: null | number;
  startTime?: null | string;
  finishTime?: null | string;
  rating?: null | number;
  remark?: null | string;
}

export interface MovieReq {
  id?: null | string;
  title?: null | string;
  type?: null | number;
  director?: null | string;
  url?: null | string;
  fileId?: null | string;
  coverImgUrl?: null | string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  totalProgress?: null | number;
  currentProgress?: null | number;
  startTime?: null | string;
  finishTime?: null | string;
  rating?: null | number;
  remark?: null | string;
}

export interface NotificationPreferenceUpdateReq {
  items?: Array<NotificationPreferenceUpdateReq_Item> | null;
}

export interface NotificationPreferenceUpdateReq_Item {
  bizType?: null | string;
  channel?: null | string;
  enabled?: boolean | null;
}

export interface PasswordVaultCreateReq {
  title?: null | string;
  website?: null | string;
  category?: null | string;
  username?: null | string;
  password?: null | string;
  salt?: null | string;
  remark?: null | string;
  favorite?: boolean | null;
}

export interface PasswordVaultUpdateReq {
  title?: null | string;
  website?: null | string;
  category?: null | string;
  username?: null | string;
  password?: null | string;
  salt?: null | string;
  remark?: null | string;
  favorite?: boolean | null;
}

export interface PerformanceCreateReq {
  performanceName?: null | string;
  performer?: null | string;
  performanceType?: null | string;
  performanceDate?: null | string;
  city?: null | string;
  venue?: null | string;
  ticketPrice?: null | number | string;
  seatInfo?: null | string;
  duration?: null | number;
  rating?: null | number;
  review?: null | string;
  purchasePlatform?: null | string;
  orderNumber?: null | string;
  fileIds?: Array<string> | null;
}

export interface PerformanceUpdateReq {
  id?: null | string;
  performanceName?: null | string;
  performer?: null | string;
  performanceType?: null | string;
  performanceDate?: null | string;
  city?: null | string;
  venue?: null | string;
  ticketPrice?: null | number | string;
  seatInfo?: null | string;
  duration?: null | number;
  rating?: null | number;
  review?: null | string;
  purchasePlatform?: null | string;
  orderNumber?: null | string;
  fileIds?: Array<string> | null;
}

export interface PersonReq {
  name?: null | string;
  avatar?: null | string;
  category?: null | string;
  description?: null | string;
  tags?: null | string;
  birthday?: null | string;
  phone?: null | string;
  email?: null | string;
  school?: null | string;
  socialLinks?: null | string;
  notes?: null | string;
}

export interface QuickNavSaveReq {
  items?: Array<QuickNavSaveReq_Item> | null;
}

export interface QuickNavSaveReq_Item {
  menuId?: null | string;
  sortOrder?: null | number;
  enabled?: null | number;
}

export interface ReadRecordCreateReq {
  title?: null | string;
  type?: null | number;
  author?: null | string;
  url?: null | string;
  fileId?: null | string;
  coverImgUrl?: null | string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  totalProgress?: null | number;
  currentProgress?: null | number;
  startTime?: null | string;
  finishTime?: null | string;
  remark?: null | string;
}

export interface ReadRecordReq {
  id?: null | string;
  title?: null | string;
  type?: null | number;
  author?: null | string;
  url?: null | string;
  fileId?: null | string;
  coverImgUrl?: null | string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'on_hold' | null;
  totalProgress?: null | number;
  currentProgress?: null | number;
  startTime?: null | string;
  finishTime?: null | string;
  remark?: null | string;
}

export interface RegisterReq {
  username?: null | string;
  password?: null | string;
  email?: null | string;
  code?: null | string;
}

export interface RelationshipDeleteReq {
  sourcePersonId?: null | string;
  targetPersonId?: null | string;
}

export interface RelationshipReq {
  sourcePersonId?: null | string;
  targetPersonId?: null | string;
  relationType?: null | string;
  direction?: null | string;
  description?: null | string;
  tags?: null | string;
}

export interface RelationshipUpdateReq {
  relationType?: null | string;
  direction?: null | string;
  description?: null | string;
  tags?: null | string;
}

export interface ResetPasswordReq {
  email?: null | string;
  password?: null | string;
  code?: null | string;
}

export interface ResetSecondaryPasswordReq {
  code?: null | string;
  password?: null | string;
}

export interface SaveSecondaryLockMenusReq {
  menuIds?: Array<string> | null;
  secondaryPassword?: null | string;
}

export interface SecondaryVerifyReq {
  password?: null | string;
  menuPath?: null | string;
}

export interface SendEmailCodeReq {
  email?: null | string;
}

export interface SetSecondaryPasswordReq {
  password?: null | string;
  oldPassword?: null | string;
}

export interface SysDictDataCreateReq {
  dictId?: null | string;
  dictSort?: null | number;
  dictLabel?: null | string;
  dictValue?: null | string;
  cssClass?: null | string;
  listClass?: null | string;
  isDefault?: null | string;
  status?: null | string;
  remark?: null | string;
}

export interface SysDictDataUpdateReq {
  dictId?: null | string;
  dictSort?: null | number;
  dictLabel?: null | string;
  dictValue?: null | string;
  cssClass?: null | string;
  listClass?: null | string;
  isDefault?: null | string;
  status?: null | string;
  remark?: null | string;
}

export interface SysDictTypeCreateReq {
  dictName?: null | string;
  dictType?: null | string;
  status?: null | string;
  remark?: null | string;
}

export interface SysDictTypeUpdateReq {
  dictName?: null | string;
  dictType?: null | string;
  status?: null | string;
  remark?: null | string;
}

export interface SystemConfigUpdateReq {
  configValue?: null | string;
}

export interface TaskColumnCreateReq {
  title?: null | string;
  sortOrder?: null | number;
  bgColor?: null | string;
}

export interface TaskColumnSortReq {
  id?: null | string;
  sortOrder?: null | number;
}

export interface TaskColumnUpdateReq {
  title?: null | string;
  sortOrder?: null | number;
  bgColor?: null | string;
}

export interface TaskCreateReq {
  content?: null | string;
  detail?: null | string;
  columnId?: null | string;
  dueDate?: null | string;
  sortOrder?: null | number;
}

export interface TaskDetailCreateReq {
  isStarred?: null | number;
  taskId?: null | string;
  content?: null | string;
  isCompleted?: null | number;
  sort?: null | number;
  priority?: null | number;
  startTime?: null | string;
  endTime?: null | string;
}

export interface TaskDetailSortReq {
  id?: null | string;
  sort?: null | number;
}

export interface TaskDetailUpdateReq {
  id?: null | string;
  taskId?: null | string;
  content?: null | string;
  isCompleted?: null | number;
  sort?: null | number;
  priority?: null | number;
  startTime?: null | string;
  endTime?: null | string;
}

export interface TaskSortReq {
  id?: null | string;
  columnId?: null | string;
  sortOrder?: null | number;
}

export interface TaskUpdateReq {
  content?: null | string;
  detail?: null | string;
  columnId?: null | string;
  dueDate?: null | string;
  sortOrder?: null | number;
}

export interface ThoughtEventUpdateReq {
  id?: null | string;
  content?: null | string;
}

export interface ThoughtSaveEventReq {
  content?: null | string;
}

export interface ThoughtSaveReq {
  content?: null | string;
  isPinned?: null | number;
  events?: Array<ThoughtSaveEventReq> | null;
}

export interface ThoughtUpdateReq {
  content?: null | string;
  isPinned?: null | number;
  hiddenContent?: boolean | null;
  events?: Array<ThoughtEventUpdateReq> | null;
}

export interface TimeRecordDeleteByDateReq {
  date?: null | string;
}

export interface TimeRecordExerciseReq {
  exerciseTypeId?: null | string;
  exerciseCount?: null | number;
  description?: null | string;
}

export interface TimeRecordSaveReq {
  categoryId?: null | string;
  date?: null | string;
  startTime?: null | number;
  endTime?: null | number;
  title?: null | string;
  description?: null | string;
  relateType?: null | number;
  relateId?: null | string;
  exercises?: Array<TimeRecordExerciseReq> | null;
}

export interface TimeTrackerCategoryAdminCreateReq {
  parentId?: null | string;
  name?: null | string;
  color?: null | string;
  icon?: null | string;
  description?: null | string;
  isTrackTime?: null | number;
  sort?: null | number;
  isEnabled?: null | number;
  timeType?: null | number;
}

export interface TimeTrackerCategoryAdminUpdateReq {
  parentId?: null | string;
  name?: null | string;
  color?: null | string;
  icon?: null | string;
  description?: null | string;
  isTrackTime?: null | number;
  sort?: null | number;
  isEnabled?: null | number;
  timeType?: null | number;
}

export interface TimeTrackerCategoryCreateReq {
  parentId?: null | string;
  name?: null | string;
  color?: null | string;
  icon?: null | string;
  description?: null | string;
  isTrackTime?: null | number;
  sort?: null | number;
  isEnabled?: null | number;
  timeType?: null | number;
  templateId?: null | string;
}

export interface TimeTrackerCategorySortReq {
  id?: null | string;
  templateId?: null | string;
  sort?: null | number;
}

export interface TimeTrackerCategoryUpdateReq {
  id?: null | string;
  parentId?: null | string;
  name?: null | string;
  color?: null | string;
  icon?: null | string;
  description?: null | string;
  isTrackTime?: null | number;
  sort?: null | number;
  isEnabled?: null | number;
  timeType?: null | number;
  templateId?: null | string;
}

export interface ToolCallRequest {
  name?: null | string;
  arguments?: null | Record<string, unknown>;
}

export interface UpdateUserReq {
  nickname?: null | string;
  introduction?: null | string;
  avatar?: null | string;
}

export interface UserBindCreateReq {
  platform?: null | string;
  platformUsername?: null | string;
  accessToken?: null | string;
  metaFields?: null | string;
}

export interface UserBindUpdateReq {
  id?: null | string;
  platform?: null | string;
  platformUsername?: null | string;
  accessToken?: null | string;
  metaFields?: null | string;
}

export interface UserCreateReq {
  username?: null | string;
  password?: null | string;
  nickname?: null | string;
  avatar?: null | string;
  email?: null | string;
  role?: null | string;
  introduction?: null | string;
}

export interface UserDictDataAdminCreateReq {
  dictType?: null | string;
  dictSort?: null | number;
  dictLabel?: null | string;
  dictValue?: null | string;
  color?: null | string;
  icon?: null | string;
  extData?: null | string;
  isDefault?: null | string;
  status?: null | string;
  isReadonly?: null | string;
  remark?: null | string;
}

export interface UserDictDataAdminUpdateReq {
  dictType?: null | string;
  dictSort?: null | number;
  dictLabel?: null | string;
  dictValue?: null | string;
  color?: null | string;
  icon?: null | string;
  extData?: null | string;
  isDefault?: null | string;
  status?: null | string;
  isReadonly?: null | string;
  remark?: null | string;
}

export interface UserDictDataCreateReq {
  templateId?: null | string;
  dictType?: null | string;
  dictSort?: null | number;
  dictLabel?: null | string;
  dictValue?: null | string;
  color?: null | string;
  icon?: null | string;
  extData?: null | string;
  isDefault?: null | string;
  status?: null | string;
  isReadonly?: null | string;
  remark?: null | string;
}

export interface UserDictDataReSortReq {
  dictType?: null | string;
  dragId?: null | string;
  targetId?: null | string;
  position?: null | string;
}

export interface UserDictDataUpdateReq {
  id?: null | string;
  templateId?: null | string;
  dictType?: null | string;
  dictSort?: null | number;
  dictLabel?: null | string;
  dictValue?: null | string;
  color?: null | string;
  icon?: null | string;
  extData?: null | string;
  isDefault?: null | string;
  status?: null | string;
  isReadonly?: null | string;
  remark?: null | string;
}

export interface UserMenuHiddenSaveReq {
  menuIds?: Array<string> | null;
}

export interface UserUpdateReq {
  id?: null | string;
  username?: null | string;
  nickname?: null | string;
  avatar?: null | string;
  email?: null | string;
  role?: null | string;
  introduction?: null | string;
}

export interface WardrobeCategorySaveReq {
  name?: null | string;
  icon?: null | string;
  parentId?: null | string;
  sort?: null | number;
}

export interface WardrobeItemSaveReq {
  name?: null | string;
  categoryId?: null | string;
  color?: null | string;
  brand?: null | string;
  season?: Array<string> | null;
  purchaseDate?: null | string;
  price?: null | number | string;
  fileId?: null | string;
  size?: null | string;
  memo?: null | string;
}

export interface WechatAuthRequests_Bind {
  loginTicket?: null | string;
  password?: null | string;
}

export interface WechatAuthRequests_InitializePassword {
  loginCode?: null | string;
  newPassword?: null | string;
}

export interface WechatAuthRequests_Login {
  loginCode?: null | string;
}

export interface WechatAuthRequests_PhoneLogin {
  loginTicket?: null | string;
  phoneCode?: null | string;
}

export interface WereadConnectionReq {
  apiKey?: null | string;
}

export interface ApiRequests {
  AnniversaryRecordCreateReq: AnniversaryRecordCreateReq;
  AnniversaryRecordUpdateReq: AnniversaryRecordUpdateReq;
  ApiKeyGenerateReq: ApiKeyGenerateReq;
  BVideoCreateReq: BVideoCreateReq;
  BVideoProgressReq: BVideoProgressReq;
  BVideoUpdateReq: BVideoUpdateReq;
  BankCardReq: BankCardReq;
  BankCardTagReq: BankCardTagReq;
  CbtiPersonalitySaveReq: CbtiPersonalitySaveReq;
  CbtiTestReq: CbtiTestReq;
  ChangePasswordReq: ChangePasswordReq;
  ChatReq: ChatReq;
  ChatSessionSaveReq: ChatSessionSaveReq;
  CommonReq: CommonReq;
  DeviceCreateReq: DeviceCreateReq;
  DeviceUpdateReq: DeviceUpdateReq;
  DoubanMovieImportItemReq: DoubanMovieImportItemReq;
  DoubanMovieImportReq: DoubanMovieImportReq;
  ExerciseRecordCreateReq: ExerciseRecordCreateReq;
  ExerciseRecordUpdateReq: ExerciseRecordUpdateReq;
  ExpenseCreateReq: ExpenseCreateReq;
  ExpenseUpdateReq: ExpenseUpdateReq;
  FeedbackBatchReq: FeedbackBatchReq;
  FeedbackCommentCreateReq: FeedbackCommentCreateReq;
  FeedbackCreateReq: FeedbackCreateReq;
  FeedbackStatusUpdateReq: FeedbackStatusUpdateReq;
  FeishuChannelSaveReq: FeishuChannelSaveReq;
  GoalCreateReq: GoalCreateReq;
  GoalUpdateReq: GoalUpdateReq;
  HonorRecordCreateReq: HonorRecordCreateReq;
  HonorRecordUpdateReq: HonorRecordUpdateReq;
  IncomeCreateReq: IncomeCreateReq;
  IncomeUpdateReq: IncomeUpdateReq;
  LLMKeyCreateReq: LLMKeyCreateReq;
  LLMKeyUpdateReq: LLMKeyUpdateReq;
  LoginReq: LoginReq;
  MbtiResultSaveReq: MbtiResultSaveReq;
  MembershipCreateReq: MembershipCreateReq;
  MembershipReq: MembershipReq;
  MemoCreateReq: MemoCreateReq;
  MemoUpdateReq: MemoUpdateReq;
  MenuSaveReq: MenuSaveReq;
  MenuSortUpdateReq: MenuSortUpdateReq;
  MenuStatusUpdateReq: MenuStatusUpdateReq;
  MessageCreateReq: MessageCreateReq;
  MilestoneCreateReq: MilestoneCreateReq;
  MilestoneUpdateReq: MilestoneUpdateReq;
  MovieCreateReq: MovieCreateReq;
  MovieReq: MovieReq;
  NotificationPreferenceUpdateReq: NotificationPreferenceUpdateReq;
  NotificationPreferenceUpdateReq_Item: NotificationPreferenceUpdateReq_Item;
  PasswordVaultCreateReq: PasswordVaultCreateReq;
  PasswordVaultUpdateReq: PasswordVaultUpdateReq;
  PerformanceCreateReq: PerformanceCreateReq;
  PerformanceUpdateReq: PerformanceUpdateReq;
  PersonReq: PersonReq;
  QuickNavSaveReq: QuickNavSaveReq;
  QuickNavSaveReq_Item: QuickNavSaveReq_Item;
  ReadRecordCreateReq: ReadRecordCreateReq;
  ReadRecordReq: ReadRecordReq;
  RegisterReq: RegisterReq;
  RelationshipDeleteReq: RelationshipDeleteReq;
  RelationshipReq: RelationshipReq;
  RelationshipUpdateReq: RelationshipUpdateReq;
  ResetPasswordReq: ResetPasswordReq;
  ResetSecondaryPasswordReq: ResetSecondaryPasswordReq;
  SaveSecondaryLockMenusReq: SaveSecondaryLockMenusReq;
  SecondaryVerifyReq: SecondaryVerifyReq;
  SendEmailCodeReq: SendEmailCodeReq;
  SetSecondaryPasswordReq: SetSecondaryPasswordReq;
  SysDictDataCreateReq: SysDictDataCreateReq;
  SysDictDataUpdateReq: SysDictDataUpdateReq;
  SysDictTypeCreateReq: SysDictTypeCreateReq;
  SysDictTypeUpdateReq: SysDictTypeUpdateReq;
  SystemConfigUpdateReq: SystemConfigUpdateReq;
  TaskColumnCreateReq: TaskColumnCreateReq;
  TaskColumnSortReq: TaskColumnSortReq;
  TaskColumnUpdateReq: TaskColumnUpdateReq;
  TaskCreateReq: TaskCreateReq;
  TaskDetailCreateReq: TaskDetailCreateReq;
  TaskDetailSortReq: TaskDetailSortReq;
  TaskDetailUpdateReq: TaskDetailUpdateReq;
  TaskSortReq: TaskSortReq;
  TaskUpdateReq: TaskUpdateReq;
  ThoughtEventUpdateReq: ThoughtEventUpdateReq;
  ThoughtSaveEventReq: ThoughtSaveEventReq;
  ThoughtSaveReq: ThoughtSaveReq;
  ThoughtUpdateReq: ThoughtUpdateReq;
  TimeRecordDeleteByDateReq: TimeRecordDeleteByDateReq;
  TimeRecordExerciseReq: TimeRecordExerciseReq;
  TimeRecordSaveReq: TimeRecordSaveReq;
  TimeTrackerCategoryAdminCreateReq: TimeTrackerCategoryAdminCreateReq;
  TimeTrackerCategoryAdminUpdateReq: TimeTrackerCategoryAdminUpdateReq;
  TimeTrackerCategoryCreateReq: TimeTrackerCategoryCreateReq;
  TimeTrackerCategorySortReq: TimeTrackerCategorySortReq;
  TimeTrackerCategoryUpdateReq: TimeTrackerCategoryUpdateReq;
  ToolCallRequest: ToolCallRequest;
  UpdateUserReq: UpdateUserReq;
  UserBindCreateReq: UserBindCreateReq;
  UserBindUpdateReq: UserBindUpdateReq;
  UserCreateReq: UserCreateReq;
  UserDictDataAdminCreateReq: UserDictDataAdminCreateReq;
  UserDictDataAdminUpdateReq: UserDictDataAdminUpdateReq;
  UserDictDataCreateReq: UserDictDataCreateReq;
  UserDictDataReSortReq: UserDictDataReSortReq;
  UserDictDataUpdateReq: UserDictDataUpdateReq;
  UserMenuHiddenSaveReq: UserMenuHiddenSaveReq;
  UserUpdateReq: UserUpdateReq;
  WardrobeCategorySaveReq: WardrobeCategorySaveReq;
  WardrobeItemSaveReq: WardrobeItemSaveReq;
  WechatAuthRequests_Bind: WechatAuthRequests_Bind;
  WechatAuthRequests_InitializePassword: WechatAuthRequests_InitializePassword;
  WechatAuthRequests_Login: WechatAuthRequests_Login;
  WechatAuthRequests_PhoneLogin: WechatAuthRequests_PhoneLogin;
  WereadConnectionReq: WereadConnectionReq;
}

const fields: Record<string, Record<string, null | string>> = {
  AnniversaryRecordCreateReq: {
    title: null,
    targetDate: null,
    type: null,
    note: null,
    color: null,
    icon: null,
  },
  AnniversaryRecordUpdateReq: {
    id: null,
    title: null,
    targetDate: null,
    type: null,
    note: null,
    color: null,
    icon: null,
  },
  ApiKeyGenerateReq: {
    remark: null,
    expireDays: null,
  },
  BVideoCreateReq: {
    title: null,
    url: null,
    cover: null,
    duration: null,
    watchedDuration: null,
    episodes: null,
    currentEpisode: null,
    status: null,
    notes: null,
    bvid: null,
    aid: null,
    description: null,
    ownerName: null,
    pagesInfo: null,
  },
  BVideoProgressReq: {
    title: null,
    url: null,
    cover: null,
    duration: null,
    watchedDuration: null,
    episodes: null,
    currentEpisode: null,
    status: null,
    notes: null,
    bvid: null,
    aid: null,
    description: null,
    ownerName: null,
    pagesInfo: null,
  },
  BVideoUpdateReq: {
    title: null,
    url: null,
    cover: null,
    duration: null,
    watchedDuration: null,
    episodes: null,
    currentEpisode: null,
    status: null,
    notes: null,
    bvid: null,
    aid: null,
    description: null,
    ownerName: null,
    pagesInfo: null,
  },
  BankCardReq: {
    bankId: null,
    customBankName: null,
    cardName: null,
    alias: null,
    cardType: null,
    cardNo: null,
    branchName: null,
    status: null,
    openedDate: null,
    expiryMonth: null,
    creditLimit: null,
    statementDay: null,
    repaymentDay: null,
    coverColor: null,
    coverSourceUrl: null,
    sortOrder: null,
    remark: null,
    tagIds: null,
    coverFileIds: null,
  },
  BankCardTagReq: {
    name: null,
    color: null,
    status: null,
  },
  CbtiPersonalitySaveReq: {
    code: null,
    name: null,
    motto: null,
    color: null,
    vector: null,
    description: null,
    strengths: null,
    weaknesses: null,
    techStack: null,
    spirit: null,
    imageObject: null,
    isSpecial: null,
  },
  CbtiTestReq: {
    answers: null,
    hiddenAnswers: null,
  },
  ChangePasswordReq: {
    oldPassword: null,
    newPassword: null,
  },
  ChatReq: {
    prompt: null,
    conversationId: null,
  },
  ChatSessionSaveReq: {
    title: null,
  },
  CommonReq: {
    idList: null,
  },
  DeviceCreateReq: {
    name: null,
    spec: null,
    type: null,
    status: null,
    remark: null,
    purchaseDate: null,
    purchasePrice: null,
    purchasePlace: null,
    fileId: null,
    endDate: null,
  },
  DeviceUpdateReq: {
    name: null,
    spec: null,
    type: null,
    status: null,
    remark: null,
    purchaseDate: null,
    purchasePrice: null,
    purchasePlace: null,
    fileId: null,
    endDate: null,
  },
  DoubanMovieImportItemReq: {
    rowNumber: null,
    doubanSubjectId: null,
    title: null,
    type: null,
    director: null,
    url: null,
    status: null,
    markedDate: null,
    rating: null,
    remark: null,
  },
  DoubanMovieImportReq: {
    format: null,
    version: null,
    source: null,
    doubanUserId: null,
    duplicatePolicy: null,
    records: 'DoubanMovieImportItemReq',
  },
  ExerciseRecordCreateReq: {
    exerciseTypeId: null,
    exerciseDate: null,
    exerciseCount: null,
    description: null,
  },
  ExerciseRecordUpdateReq: {
    exerciseTypeId: null,
    exerciseDate: null,
    exerciseCount: null,
    description: null,
  },
  ExpenseCreateReq: {
    transactionAmt: null,
    amt: null,
    expTypeId: null,
    payTypeId: null,
    counterparty: null,
    counterpartyAcct: null,
    remark: null,
    expTime: null,
    transactionId: null,
    expDesc: null,
    merchantOrderNo: null,
    transactionStatus: null,
  },
  ExpenseUpdateReq: {
    id: null,
    transactionAmt: null,
    amt: null,
    expTypeId: null,
    payTypeId: null,
    counterparty: null,
    counterpartyAcct: null,
    remark: null,
    expTime: null,
    transactionId: null,
    expDesc: null,
    merchantOrderNo: null,
    transactionStatus: null,
  },
  FeedbackBatchReq: {
    idList: null,
    action: null,
  },
  FeedbackCommentCreateReq: {
    content: null,
    fileIds: null,
  },
  FeedbackCreateReq: {
    title: null,
    content: null,
    feedbackType: null,
    priority: null,
    fileIds: null,
  },
  FeedbackStatusUpdateReq: {
    status: null,
  },
  FeishuChannelSaveReq: {
    enabled: null,
    appId: null,
    appSecret: null,
    openId: null,
  },
  GoalCreateReq: {
    type: null,
    title: null,
    description: null,
    content: null,
    status: null,
    targetValue: null,
    currentValue: null,
    year: null,
    month: null,
    day: null,
    parentId: null,
    startDate: null,
    endDate: null,
    tags: null,
  },
  GoalUpdateReq: {
    id: null,
    type: null,
    title: null,
    description: null,
    content: null,
    status: null,
    targetValue: null,
    currentValue: null,
    year: null,
    month: null,
    day: null,
    parentId: null,
    startDate: null,
    endDate: null,
    tags: null,
  },
  HonorRecordCreateReq: {
    title: null,
    description: null,
    honorDate: null,
    issuer: null,
    level: null,
    categoryId: null,
    customCategory: null,
    tags: null,
    isTop: null,
    isPublic: null,
    sortOrder: null,
    fileIds: null,
  },
  HonorRecordUpdateReq: {
    id: null,
    title: null,
    description: null,
    honorDate: null,
    issuer: null,
    level: null,
    categoryId: null,
    customCategory: null,
    tags: null,
    isTop: null,
    isPublic: null,
    sortOrder: null,
    fileIds: null,
  },
  IncomeCreateReq: {
    amt: null,
    incDate: null,
    remark: null,
    incTypeId: null,
    tax: null,
  },
  IncomeUpdateReq: {
    amt: null,
    incDate: null,
    remark: null,
    incTypeId: null,
    tax: null,
  },
  LLMKeyCreateReq: {
    modelName: null,
    apiKey: null,
    baseUrl: null,
    isDefault: null,
  },
  LLMKeyUpdateReq: {
    id: null,
    modelName: null,
    apiKey: null,
    baseUrl: null,
    isDefault: null,
  },
  LoginReq: {
    username: null,
    password: null,
  },
  MbtiResultSaveReq: {
    testId: null,
    mbtiType: null,
    resultsPage: null,
    predictions: null,
    traitOrderConscious: null,
    traitOrderShadow: null,
    matches: null,
  },
  MembershipCreateReq: {
    name: null,
    category: null,
    provider: null,
    icon: null,
    color: null,
    startDate: null,
    expiryDate: null,
    price: null,
    billingCycle: null,
    monthlyAmount: null,
    autoRenew: null,
    note: null,
  },
  MembershipReq: {
    id: null,
    name: null,
    category: null,
    provider: null,
    icon: null,
    color: null,
    startDate: null,
    expiryDate: null,
    price: null,
    billingCycle: null,
    monthlyAmount: null,
    autoRenew: null,
    note: null,
  },
  MemoCreateReq: {
    title: null,
    content: null,
    hiddenContent: null,
  },
  MemoUpdateReq: {
    title: null,
    content: null,
    hiddenContent: null,
  },
  MenuSaveReq: {
    parentId: null,
    name: null,
    path: null,
    component: null,
    redirect: null,
    meta: null,
    roles: null,
    sort: null,
    status: null,
  },
  MenuSortUpdateReq: {
    sort: null,
  },
  MenuStatusUpdateReq: {
    status: null,
  },
  MessageCreateReq: {
    receiverId: null,
    title: null,
    content: null,
    type: null,
  },
  MilestoneCreateReq: {
    title: null,
    description: null,
    date: null,
    end_date: null,
    type: null,
    tags: null,
  },
  MilestoneUpdateReq: {
    id: null,
    title: null,
    description: null,
    date: null,
    end_date: null,
    type: null,
    tags: null,
  },
  MovieCreateReq: {
    title: null,
    type: null,
    director: null,
    url: null,
    fileId: null,
    coverImgUrl: null,
    status: null,
    totalProgress: null,
    currentProgress: null,
    startTime: null,
    finishTime: null,
    rating: null,
    remark: null,
  },
  MovieReq: {
    id: null,
    title: null,
    type: null,
    director: null,
    url: null,
    fileId: null,
    coverImgUrl: null,
    status: null,
    totalProgress: null,
    currentProgress: null,
    startTime: null,
    finishTime: null,
    rating: null,
    remark: null,
  },
  NotificationPreferenceUpdateReq: {
    items: 'NotificationPreferenceUpdateReq_Item',
  },
  NotificationPreferenceUpdateReq_Item: {
    bizType: null,
    channel: null,
    enabled: null,
  },
  PasswordVaultCreateReq: {
    title: null,
    website: null,
    category: null,
    username: null,
    password: null,
    salt: null,
    remark: null,
    favorite: null,
  },
  PasswordVaultUpdateReq: {
    title: null,
    website: null,
    category: null,
    username: null,
    password: null,
    salt: null,
    remark: null,
    favorite: null,
  },
  PerformanceCreateReq: {
    performanceName: null,
    performer: null,
    performanceType: null,
    performanceDate: null,
    city: null,
    venue: null,
    ticketPrice: null,
    seatInfo: null,
    duration: null,
    rating: null,
    review: null,
    purchasePlatform: null,
    orderNumber: null,
    fileIds: null,
  },
  PerformanceUpdateReq: {
    id: null,
    performanceName: null,
    performer: null,
    performanceType: null,
    performanceDate: null,
    city: null,
    venue: null,
    ticketPrice: null,
    seatInfo: null,
    duration: null,
    rating: null,
    review: null,
    purchasePlatform: null,
    orderNumber: null,
    fileIds: null,
  },
  PersonReq: {
    name: null,
    avatar: null,
    category: null,
    description: null,
    tags: null,
    birthday: null,
    phone: null,
    email: null,
    school: null,
    socialLinks: null,
    notes: null,
  },
  QuickNavSaveReq: {
    items: 'QuickNavSaveReq_Item',
  },
  QuickNavSaveReq_Item: {
    menuId: null,
    sortOrder: null,
    enabled: null,
  },
  ReadRecordCreateReq: {
    title: null,
    type: null,
    author: null,
    url: null,
    fileId: null,
    coverImgUrl: null,
    status: null,
    totalProgress: null,
    currentProgress: null,
    startTime: null,
    finishTime: null,
    remark: null,
  },
  ReadRecordReq: {
    id: null,
    title: null,
    type: null,
    author: null,
    url: null,
    fileId: null,
    coverImgUrl: null,
    status: null,
    totalProgress: null,
    currentProgress: null,
    startTime: null,
    finishTime: null,
    remark: null,
  },
  RegisterReq: {
    username: null,
    password: null,
    email: null,
    code: null,
  },
  RelationshipDeleteReq: {
    sourcePersonId: null,
    targetPersonId: null,
  },
  RelationshipReq: {
    sourcePersonId: null,
    targetPersonId: null,
    relationType: null,
    direction: null,
    description: null,
    tags: null,
  },
  RelationshipUpdateReq: {
    relationType: null,
    direction: null,
    description: null,
    tags: null,
  },
  ResetPasswordReq: {
    email: null,
    password: null,
    code: null,
  },
  ResetSecondaryPasswordReq: {
    code: null,
    password: null,
  },
  SaveSecondaryLockMenusReq: {
    menuIds: null,
    secondaryPassword: null,
  },
  SecondaryVerifyReq: {
    password: null,
    menuPath: null,
  },
  SendEmailCodeReq: {
    email: null,
  },
  SetSecondaryPasswordReq: {
    password: null,
    oldPassword: null,
  },
  SysDictDataCreateReq: {
    dictId: null,
    dictSort: null,
    dictLabel: null,
    dictValue: null,
    cssClass: null,
    listClass: null,
    isDefault: null,
    status: null,
    remark: null,
  },
  SysDictDataUpdateReq: {
    dictId: null,
    dictSort: null,
    dictLabel: null,
    dictValue: null,
    cssClass: null,
    listClass: null,
    isDefault: null,
    status: null,
    remark: null,
  },
  SysDictTypeCreateReq: {
    dictName: null,
    dictType: null,
    status: null,
    remark: null,
  },
  SysDictTypeUpdateReq: {
    dictName: null,
    dictType: null,
    status: null,
    remark: null,
  },
  SystemConfigUpdateReq: {
    configValue: null,
  },
  TaskColumnCreateReq: {
    title: null,
    sortOrder: null,
    bgColor: null,
  },
  TaskColumnSortReq: {
    id: null,
    sortOrder: null,
  },
  TaskColumnUpdateReq: {
    title: null,
    sortOrder: null,
    bgColor: null,
  },
  TaskCreateReq: {
    content: null,
    detail: null,
    columnId: null,
    dueDate: null,
    sortOrder: null,
  },
  TaskDetailCreateReq: {
    isStarred: null,
    taskId: null,
    content: null,
    isCompleted: null,
    sort: null,
    priority: null,
    startTime: null,
    endTime: null,
  },
  TaskDetailSortReq: {
    id: null,
    sort: null,
  },
  TaskDetailUpdateReq: {
    id: null,
    taskId: null,
    content: null,
    isCompleted: null,
    sort: null,
    priority: null,
    startTime: null,
    endTime: null,
  },
  TaskSortReq: {
    id: null,
    columnId: null,
    sortOrder: null,
  },
  TaskUpdateReq: {
    content: null,
    detail: null,
    columnId: null,
    dueDate: null,
    sortOrder: null,
  },
  ThoughtEventUpdateReq: {
    id: null,
    content: null,
  },
  ThoughtSaveEventReq: {
    content: null,
  },
  ThoughtSaveReq: {
    content: null,
    isPinned: null,
    events: 'ThoughtSaveEventReq',
  },
  ThoughtUpdateReq: {
    content: null,
    isPinned: null,
    hiddenContent: null,
    events: 'ThoughtEventUpdateReq',
  },
  TimeRecordDeleteByDateReq: {
    date: null,
  },
  TimeRecordExerciseReq: {
    exerciseTypeId: null,
    exerciseCount: null,
    description: null,
  },
  TimeRecordSaveReq: {
    categoryId: null,
    date: null,
    startTime: null,
    endTime: null,
    title: null,
    description: null,
    relateType: null,
    relateId: null,
    exercises: 'TimeRecordExerciseReq',
  },
  TimeTrackerCategoryAdminCreateReq: {
    parentId: null,
    name: null,
    color: null,
    icon: null,
    description: null,
    isTrackTime: null,
    sort: null,
    isEnabled: null,
    timeType: null,
  },
  TimeTrackerCategoryAdminUpdateReq: {
    parentId: null,
    name: null,
    color: null,
    icon: null,
    description: null,
    isTrackTime: null,
    sort: null,
    isEnabled: null,
    timeType: null,
  },
  TimeTrackerCategoryCreateReq: {
    parentId: null,
    name: null,
    color: null,
    icon: null,
    description: null,
    isTrackTime: null,
    sort: null,
    isEnabled: null,
    timeType: null,
    templateId: null,
  },
  TimeTrackerCategorySortReq: {
    id: null,
    templateId: null,
    sort: null,
  },
  TimeTrackerCategoryUpdateReq: {
    id: null,
    parentId: null,
    name: null,
    color: null,
    icon: null,
    description: null,
    isTrackTime: null,
    sort: null,
    isEnabled: null,
    timeType: null,
    templateId: null,
  },
  ToolCallRequest: {
    name: null,
    arguments: null,
  },
  UpdateUserReq: {
    nickname: null,
    introduction: null,
    avatar: null,
  },
  UserBindCreateReq: {
    platform: null,
    platformUsername: null,
    accessToken: null,
    metaFields: null,
  },
  UserBindUpdateReq: {
    id: null,
    platform: null,
    platformUsername: null,
    accessToken: null,
    metaFields: null,
  },
  UserCreateReq: {
    username: null,
    password: null,
    nickname: null,
    avatar: null,
    email: null,
    role: null,
    introduction: null,
  },
  UserDictDataAdminCreateReq: {
    dictType: null,
    dictSort: null,
    dictLabel: null,
    dictValue: null,
    color: null,
    icon: null,
    extData: null,
    isDefault: null,
    status: null,
    isReadonly: null,
    remark: null,
  },
  UserDictDataAdminUpdateReq: {
    dictType: null,
    dictSort: null,
    dictLabel: null,
    dictValue: null,
    color: null,
    icon: null,
    extData: null,
    isDefault: null,
    status: null,
    isReadonly: null,
    remark: null,
  },
  UserDictDataCreateReq: {
    templateId: null,
    dictType: null,
    dictSort: null,
    dictLabel: null,
    dictValue: null,
    color: null,
    icon: null,
    extData: null,
    isDefault: null,
    status: null,
    isReadonly: null,
    remark: null,
  },
  UserDictDataReSortReq: {
    dictType: null,
    dragId: null,
    targetId: null,
    position: null,
  },
  UserDictDataUpdateReq: {
    id: null,
    templateId: null,
    dictType: null,
    dictSort: null,
    dictLabel: null,
    dictValue: null,
    color: null,
    icon: null,
    extData: null,
    isDefault: null,
    status: null,
    isReadonly: null,
    remark: null,
  },
  UserMenuHiddenSaveReq: {
    menuIds: null,
  },
  UserUpdateReq: {
    id: null,
    username: null,
    nickname: null,
    avatar: null,
    email: null,
    role: null,
    introduction: null,
  },
  WardrobeCategorySaveReq: {
    name: null,
    icon: null,
    parentId: null,
    sort: null,
  },
  WardrobeItemSaveReq: {
    name: null,
    categoryId: null,
    color: null,
    brand: null,
    season: null,
    purchaseDate: null,
    price: null,
    fileId: null,
    size: null,
    memo: null,
  },
  WechatAuthRequests_Bind: {
    loginTicket: null,
    password: null,
  },
  WechatAuthRequests_InitializePassword: {
    loginCode: null,
    newPassword: null,
  },
  WechatAuthRequests_Login: {
    loginCode: null,
  },
  WechatAuthRequests_PhoneLogin: {
    loginTicket: null,
    phoneCode: null,
  },
  WereadConnectionReq: {
    apiKey: null,
  },
};

/** 在发送点选择允许的字段，防止列表记录、审计字段和客户端派生字段被整对象回传。 */
export function pickPayload<K extends keyof ApiRequests>(
  name: K,
  value: unknown,
): ApiRequests[K] {
  const input = (value ?? {}) as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(fields[name] ?? {})) {
    if (!Object.hasOwn(input, key) || input[key] === undefined) continue;
    const item = input[key];
    result[key] =
      nested && item !== null
        ? Array.isArray(item)
          ? item.map((entry) => pickPayload(nested as K, entry))
          : pickPayload(nested as K, item)
        : item;
  }
  return result as ApiRequests[K];
}

export function pickPayloadList<K extends keyof ApiRequests>(
  name: K,
  values: unknown[],
): ApiRequests[K][] {
  return values.map((value) => pickPayload(name, value));
}

const queryFields: Record<string, string[]> = {
  '/bank-cards': [],
  '/bank-cards/banks': [],
  '/bank-cards/{id}': [],
  '/bank-cards/tags': [],
  '/docs/catalog': [],
  '/docs/operations': ['keyword', 'module', 'page', 'pageSize'],
  '/docs/operations/{operationId}': [],
  '/feedback/admin/list': [
    'endTime',
    'feedbackType',
    'keyword',
    'page',
    'pageSize',
    'startTime',
    'status',
    'userId',
  ],
  '/feedback/admin/{id}': [],
  '/feedback/admin/admin-users': [],
  '/feedback/my': [
    'endTime',
    'feedbackType',
    'keyword',
    'page',
    'pageSize',
    'startTime',
    'status',
    'userId',
  ],
  '/feedback/my/{id}': [],
  '/llm/chat/history': ['conversationId'],
  '/llm/sessions': [],
  '/llm/key/list': [],
  '/llm/key/default': [],
  '/mcp/tools': [],
  '/membership/list': [],
  '/membership/stats': [],
  '/membership/{id}': [],
  '/anniversaryRecords': [],
  '/anniversaryRecords/{id}': [],
  '/b-video/query': ['page', 'pageSize', 'status'],
  '/b-video/getStatusCount': [],
  '/b-video/statistics': [],
  '/cbti/admin/personalities': [],
  '/cbti/questions': [],
  '/cbti/personalities': [],
  '/cbti/personalities/{code}': [],
  '/cbti/results': [],
  '/cbti/result/{id}': [],
  '/csdn/stats': ['username'],
  '/csdn/articles': ['limit', 'username'],
  '/dashboard/tasks': [],
  '/dashboard/card/{type}': [],
  '/device/query': ['page', 'pageSize', 'type'],
  '/device/{id}': [],
  '/exerciseRecord/query': ['exerciseTypeId', 'page', 'pageSize'],
  '/exerciseRecord/get/{id}': [],
  '/exerciseRecord/statistics': ['endDate', 'exerciseTypeId', 'startDate'],
  '/exerciseRecord/statistics/light': [
    'endDate',
    'exerciseTypeId',
    'startDate',
  ],
  '/exerciseRecord/dashboardSummary': ['lastDate', 'limit'],
  '/expense/query': [
    'counterparty',
    'endTime',
    'expDesc',
    'expTypeId',
    'page',
    'pageSize',
    'payTypeId',
    'remark',
    'startTime',
    'year',
  ],
  '/expense/statisticsByYear': [],
  '/expense/statisticsByMonth': [],
  '/github/recent-commits': ['page', 'perPage'],
  '/goals': ['keyword', 'status', 'type'],
  '/honorCategories': [],
  '/honorRecords': [],
  '/honorRecords/{id}': [],
  '/income/query': [
    'endTime',
    'incTypeId',
    'page',
    'pageSize',
    'startTime',
    'year',
  ],
  '/income/statisticsByYear': [],
  '/income/statisticsByMonth': [],
  '/mbti/test/{testId}': [],
  '/mbti/results': [],
  '/mbti/result/{id}': [],
  '/memo/query': ['content', 'page', 'pageSize'],
  '/milestones': [],
  '/movie/page': [
    'activeOnly',
    'current',
    'director',
    'size',
    'status',
    'statuses',
    'title',
    'type',
  ],
  '/movie/{id}': [],
  '/movie/parse-douban': ['url'],
  '/movie/active': [],
  '/notification/channels/feishu': [],
  '/notification/channels/feishu/recipients': [],
  '/notification/preferences': [],
  '/password/list': [],
  '/password/{id}': [],
  '/password/categories': [],
  '/performance': ['page', 'pageSize'],
  '/read-record/page': [
    'activeOnly',
    'current',
    'inProgressFirst',
    'size',
    'status',
    'statuses',
    'title',
    'type',
  ],
  '/read-record/{id}': [],
  '/read-record/parse-douban': ['url'],
  '/read-record/active': [],
  '/sysDictData/query': ['dictLabel', 'dictType', 'page', 'pageSize'],
  '/sysDictType/getByDictType': ['dictType'],
  '/sysDictType/query': ['dictName', 'page', 'pageSize'],
  '/file/preview/{id:[a-fA-F0-9]{32}}': [],
  '/file/download/{id:[a-fA-F0-9]{32}}': [],
  '/taskColumn/query': ['page', 'pageSize'],
  '/tasks': ['get', 'pageSize', 'taskId'],
  '/taskDetails': ['taskId'],
  '/taskDetails/watched': [],
  '/thought/query': [
    'content',
    'hiddenContent',
    'id',
    'isPinned',
    'page',
    'pageSize',
  ],
  '/thought/dashboard': [],
  '/timeRecord/query': ['date', 'page', 'pageSize'],
  '/timeRecord/queryByDateRange': ['endDate', 'page', 'pageSize', 'startDate'],
  '/timeRecord/queryByDateRangeForAI': [],
  '/timeRecord/{id}': [],
  '/timeRecord/recommendType': ['date', 'previousCategoryId', 'time'],
  '/timeRecord/recommendNext': ['date'],
  '/timeRecord/relateTypes': [],
  '/timeTrackerCategory/list': [],
  '/timeTrackerCategory/all': [],
  '/timeTrackerCategory/hidden': [],
  '/timeTrackerCategory/admin/list': [],
  '/userbinds/list': ['includeToken'],
  '/userbinds/douban/verify': ['accountId'],
  '/userDictData/query': [
    'dictLabel',
    'dictType',
    'page',
    'pageSize',
    'status',
  ],
  '/userDictData/{id}': [],
  '/userDictData/admin/query': [
    'dictLabel',
    'dictType',
    'page',
    'pageSize',
    'status',
  ],
  '/userDictType/dictTypeEnum': [],
  '/userDictType/getByDictType': ['dictType'],
  '/weread/connection': [],
  '/weread/stats': ['baseTime', 'mode'],
  '/weread/notes': ['bookId'],
  '/weread/progress': ['bookId'],
  '/relationships/graph': [],
  '/relationships/persons': [],
  '/relationships/persons/{id}': [],
  '/relationships/persons/search': ['keyword'],
  '/api-key/list': [],
  '/file/preview/{*fileName}': [],
  '/message/list': ['isRead'],
  '/message/unread-count': [],
  '/message/admin/list': ['current', 'size', 'userId'],
  '/user-center/list': ['keyword', 'page', 'pageSize'],
  '/auth/info': [],
  '/user/info': [],
  '/user/{id}/basic': [],
  '/auth/codes': [],
  '/auth/secondary-password/status': [],
  '/auth/secondary-lock/menus': [],
  '/auth/wechat/mini/capabilities': [],
  '/system/logs/{type:operation|access}': [
    'endDate',
    'page',
    'pageSize',
    'startDate',
    'username',
  ],
  '/system/logs/{type:operation|access}/export': [
    'endDate',
    'page',
    'pageSize',
    'startDate',
    'username',
  ],
  '/menu/admin/tree': [],
  '/menu/admin/role-options': [],
  '/menu/all': [],
  '/quick-nav/candidates': [],
  '/quick-nav/my': [],
  '/system-config/list': ['keyPrefix'],
  '/system-config/{key}': [],
  '/menu/preferences': [],
  '/wardrobe/items': ['categoryId', 'keyword', 'season'],
  '/wardrobe/items/{id}': [],
  '/wardrobe/stats': [],
  '/wardrobe/categories': [],
};

const requestModels: Array<{
  list: boolean;
  method: string;
  model: keyof ApiRequests;
  path: string;
}> = [
  { method: 'POST', path: '/bank-cards', model: 'BankCardReq', list: false },
  {
    method: 'PUT',
    path: '/bank-cards/{id}',
    model: 'BankCardReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/bank-cards/tags',
    model: 'BankCardTagReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/bank-cards/tags/{id}',
    model: 'BankCardTagReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/feedback/admin/{id}/reply',
    model: 'FeedbackCommentCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/feedback/admin/{id}/status',
    model: 'FeedbackStatusUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/feedback/admin/batch',
    model: 'FeedbackBatchReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/feedback',
    model: 'FeedbackCreateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/feedback/{id}/comment',
    model: 'FeedbackCommentCreateReq',
    list: false,
  },
  { method: 'POST', path: '/llm/chat', model: 'ChatReq', list: false },
  { method: 'POST', path: '/llm/chat/stream', model: 'ChatReq', list: false },
  {
    method: 'POST',
    path: '/llm/sessions',
    model: 'ChatSessionSaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/llm/sessions/{conversationId}',
    model: 'ChatSessionSaveReq',
    list: false,
  },
  { method: 'POST', path: '/llm/key', model: 'LLMKeyCreateReq', list: false },
  { method: 'PUT', path: '/llm/key', model: 'LLMKeyUpdateReq', list: false },
  {
    method: 'POST',
    path: '/mcp/tools/call',
    model: 'ToolCallRequest',
    list: false,
  },
  {
    method: 'POST',
    path: '/membership',
    model: 'MembershipCreateReq',
    list: false,
  },
  { method: 'PUT', path: '/membership', model: 'MembershipReq', list: false },
  {
    method: 'POST',
    path: '/anniversaryRecords',
    model: 'AnniversaryRecordCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/anniversaryRecords',
    model: 'AnniversaryRecordUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/anniversaryRecords/batchDelete',
    model: 'CommonReq',
    list: false,
  },
  { method: 'POST', path: '/b-video', model: 'BVideoCreateReq', list: false },
  {
    method: 'PUT',
    path: '/b-video/{id}',
    model: 'BVideoUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/b-video/tagVideo',
    model: 'BVideoCreateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/b-video/syncProgress',
    model: 'BVideoProgressReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/cbti/admin/personalities',
    model: 'CbtiPersonalitySaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/cbti/admin/personalities/{id}',
    model: 'CbtiPersonalitySaveReq',
    list: false,
  },
  { method: 'POST', path: '/cbti/test', model: 'CbtiTestReq', list: false },
  { method: 'POST', path: '/device', model: 'DeviceCreateReq', list: false },
  {
    method: 'PUT',
    path: '/device/{id}',
    model: 'DeviceUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/exerciseRecord',
    model: 'ExerciseRecordCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/exerciseRecord/{id}',
    model: 'ExerciseRecordUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/exerciseRecord/deleteBatch',
    model: 'CommonReq',
    list: false,
  },
  { method: 'POST', path: '/expense', model: 'ExpenseCreateReq', list: false },
  { method: 'PUT', path: '/expense', model: 'ExpenseUpdateReq', list: false },
  {
    method: 'POST',
    path: '/expense/saveBatch',
    model: 'ExpenseCreateReq',
    list: true,
  },
  {
    method: 'POST',
    path: '/expense/deleteBatch',
    model: 'CommonReq',
    list: false,
  },
  { method: 'POST', path: '/goals', model: 'GoalCreateReq', list: false },
  { method: 'PUT', path: '/goals', model: 'GoalUpdateReq', list: false },
  {
    method: 'POST',
    path: '/goals/batchDelete',
    model: 'CommonReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/honorRecords',
    model: 'HonorRecordCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/honorRecords',
    model: 'HonorRecordUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/honorRecords/batchDelete',
    model: 'CommonReq',
    list: false,
  },
  { method: 'POST', path: '/income', model: 'IncomeCreateReq', list: false },
  {
    method: 'PUT',
    path: '/income/{incomeId}',
    model: 'IncomeUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/mbti/result',
    model: 'MbtiResultSaveReq',
    list: false,
  },
  { method: 'POST', path: '/memo', model: 'MemoCreateReq', list: false },
  { method: 'PUT', path: '/memo/{id}', model: 'MemoUpdateReq', list: false },
  {
    method: 'POST',
    path: '/milestones',
    model: 'MilestoneCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/milestones',
    model: 'MilestoneUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/milestones/batchDelete',
    model: 'CommonReq',
    list: false,
  },
  { method: 'POST', path: '/movie', model: 'MovieCreateReq', list: false },
  { method: 'PUT', path: '/movie', model: 'MovieReq', list: false },
  {
    method: 'POST',
    path: '/movie/import/douban/preview',
    model: 'DoubanMovieImportReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/movie/import/douban',
    model: 'DoubanMovieImportReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/notification/channels/feishu',
    model: 'FeishuChannelSaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/notification/preferences',
    model: 'NotificationPreferenceUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/password',
    model: 'PasswordVaultCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/password/{id}',
    model: 'PasswordVaultUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/performance',
    model: 'PerformanceCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/performance',
    model: 'PerformanceUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/read-record',
    model: 'ReadRecordCreateReq',
    list: false,
  },
  { method: 'PUT', path: '/read-record', model: 'ReadRecordReq', list: false },
  {
    method: 'POST',
    path: '/sysDictData',
    model: 'SysDictDataCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/sysDictData/{dictCode}',
    model: 'SysDictDataUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/sysDictType',
    model: 'SysDictTypeCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/sysDictType/{dictId}',
    model: 'SysDictTypeUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/taskColumn',
    model: 'TaskColumnCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/taskColumn/{id}',
    model: 'TaskColumnUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/taskColumn/reSort',
    model: 'TaskColumnSortReq',
    list: true,
  },
  { method: 'POST', path: '/tasks', model: 'TaskCreateReq', list: false },
  { method: 'PUT', path: '/tasks/{id}', model: 'TaskUpdateReq', list: false },
  { method: 'POST', path: '/tasks/reSort', model: 'TaskSortReq', list: true },
  {
    method: 'POST',
    path: '/taskDetails/reSort',
    model: 'TaskDetailSortReq',
    list: true,
  },
  {
    method: 'POST',
    path: '/taskDetails',
    model: 'TaskDetailCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/taskDetails',
    model: 'TaskDetailUpdateReq',
    list: false,
  },
  { method: 'POST', path: '/thought', model: 'ThoughtSaveReq', list: false },
  {
    method: 'PUT',
    path: '/thought/{id}',
    model: 'ThoughtUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/thought/batchDelete',
    model: 'CommonReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/timeRecord',
    model: 'TimeRecordSaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/timeRecord/{id}',
    model: 'TimeRecordSaveReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/timeRecord/deleteByDate',
    model: 'TimeRecordDeleteByDateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/timeTrackerCategory',
    model: 'TimeTrackerCategoryCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/timeTrackerCategory',
    model: 'TimeTrackerCategoryUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/timeTrackerCategory/reSort',
    model: 'TimeTrackerCategorySortReq',
    list: true,
  },
  {
    method: 'POST',
    path: '/timeTrackerCategory/admin',
    model: 'TimeTrackerCategoryAdminCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/timeTrackerCategory/admin/{id}',
    model: 'TimeTrackerCategoryAdminUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/userbinds',
    model: 'UserBindCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/userbinds',
    model: 'UserBindUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/userDictData',
    model: 'UserDictDataCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/userDictData',
    model: 'UserDictDataUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/userDictData/admin',
    model: 'UserDictDataAdminCreateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/userDictData/admin/{id}',
    model: 'UserDictDataAdminUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/userDictData/admin/reSort',
    model: 'UserDictDataReSortReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/weread/connection',
    model: 'WereadConnectionReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/relationships/persons',
    model: 'PersonReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/relationships/persons/{id}',
    model: 'PersonReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/relationships',
    model: 'RelationshipReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/relationships/{id}',
    model: 'RelationshipUpdateReq',
    list: false,
  },
  {
    method: 'DELETE',
    path: '/relationships',
    model: 'RelationshipDeleteReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/api-key/generate',
    model: 'ApiKeyGenerateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/sendEmailCode',
    model: 'SendEmailCodeReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/sendResetPasswordCode',
    model: 'SendEmailCodeReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/resetPassword',
    model: 'ResetPasswordReq',
    list: false,
  },
  { method: 'POST', path: '/auth/register', model: 'RegisterReq', list: false },
  { method: 'POST', path: '/message', model: 'MessageCreateReq', list: false },
  {
    method: 'POST',
    path: '/message/admin/send',
    model: 'MessageCreateReq',
    list: false,
  },
  { method: 'POST', path: '/user-center', model: 'UserCreateReq', list: false },
  { method: 'PUT', path: '/user-center', model: 'UserUpdateReq', list: false },
  { method: 'POST', path: '/auth/login', model: 'LoginReq', list: false },
  {
    method: 'POST',
    path: '/auth/change-password',
    model: 'ChangePasswordReq',
    list: false,
  },
  { method: 'PUT', path: '/users', model: 'UpdateUserReq', list: false },
  {
    method: 'PUT',
    path: '/auth/secondary-password',
    model: 'SetSecondaryPasswordReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/secondary-verify',
    model: 'SecondaryVerifyReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/auth/secondary-lock/menus',
    model: 'SaveSecondaryLockMenusReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/reset-secondary-password',
    model: 'ResetSecondaryPasswordReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/wechat/mini/login',
    model: 'WechatAuthRequests_Login',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/wechat/mini/phone-login',
    model: 'WechatAuthRequests_PhoneLogin',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/wechat/mini/bind',
    model: 'WechatAuthRequests_Bind',
    list: false,
  },
  {
    method: 'POST',
    path: '/auth/wechat/mini/password',
    model: 'WechatAuthRequests_InitializePassword',
    list: false,
  },
  { method: 'POST', path: '/menu/admin', model: 'MenuSaveReq', list: false },
  {
    method: 'PUT',
    path: '/menu/admin/{id}',
    model: 'MenuSaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/menu/admin/{id}/status',
    model: 'MenuStatusUpdateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/menu/admin/{id}/sort',
    model: 'MenuSortUpdateReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/quick-nav/my',
    model: 'QuickNavSaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/system-config/{key}',
    model: 'SystemConfigUpdateReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/menu/preferences',
    model: 'UserMenuHiddenSaveReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/wardrobe/items',
    model: 'WardrobeItemSaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/wardrobe/items/{id}',
    model: 'WardrobeItemSaveReq',
    list: false,
  },
  {
    method: 'POST',
    path: '/wardrobe/categories',
    model: 'WardrobeCategorySaveReq',
    list: false,
  },
  {
    method: 'PUT',
    path: '/wardrobe/categories/{id}',
    model: 'WardrobeCategorySaveReq',
    list: false,
  },
];

function samePath(pattern: string, path: string): boolean {
  const expected = pattern.split('/');
  const actual = path.split('?')[0]?.split('/') ?? [];
  return (
    expected.length === actual.length &&
    expected.every((part, index) =>
      part.startsWith('{') ? actual[index] !== '' : part === actual[index],
    )
  );
}

/** GET 只发送接口支持的筛选与分页条件。 */
export function pickQuery(
  path: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  const entries = Object.entries(queryFields);
  const entry =
    entries.find(([pattern]) => pattern === path.split('?')[0]) ??
    entries.find(([pattern]) => samePath(pattern, path));
  if (!entry) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (entry[1].includes(key) && item !== undefined && item !== null)
      result[key] = item;
  }
  return result;
}

/** 移动端存在动态业务路由，在请求边界按对应 DTO 选择字段。 */
export function minimalRequestPayload(
  path: string,
  method: string,
  value: unknown,
): unknown {
  if (value === null || value === undefined) return value;
  if (method === 'GET')
    return pickQuery(path, value as Record<string, unknown>);
  const route =
    requestModels.find(
      (entry) => entry.method === method && entry.path === path.split('?')[0],
    ) ??
    requestModels.find(
      (entry) => entry.method === method && samePath(entry.path, path),
    );
  if (!route) return value;
  return route.list
    ? pickPayloadList(route.model, value as unknown[])
    : pickPayload(route.model, value);
}
