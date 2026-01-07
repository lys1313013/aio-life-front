import dayjs from 'dayjs';

export interface ShanbayStatItem {
  num_today: number;
  used_time: number;
}

export interface ShanbayStats {
  [key: string]: ShanbayStatItem;
}

export interface ShanbayUser {
  username: string;
  nickname: string;
  id: number;
  avatar: string;
  timezone?: string;
}

export interface ShanbayCheckinData {
  id: number;
  user_id: number;
  checkin_date: string; // "YYYY-MM-DD"
  checkin_time: string; // ISO string
  num_checkin_days: number;
  info: string;
  note: string;
  stats: ShanbayStats;
  user: ShanbayUser;
  // 其他字段根据需要添加，暂未全部列出
}

export interface ShanbayCheckinResponse {
  msg: string;
  status_code: number;
  data: ShanbayCheckinData[];
}

export async function getShanbayCardInfo(username: string) {
  try {
    const response = await fetch(
      `/shanbay-api/api/v1/checkin/user/${username}/?page=1&ipp=1`,
    );
    if (!response.ok) {
      throw new Error('Failed to fetch Shanbay data');
    }

    const res: ShanbayCheckinResponse = await response.json();
    const checkins = res.data || [];
    const today = dayjs().format('YYYY-MM-DD');
    const latestCheckin = checkins[0];
    
    const hasCheckedIn = latestCheckin && dayjs(latestCheckin.checkin_date).format('YYYY-MM-DD') === today;
    
    // 计算今日学习时间
    let totalUsedTime = 0;
    if (latestCheckin && latestCheckin.stats) {
      Object.values(latestCheckin.stats).forEach((item) => {
        if (item && typeof item.used_time === 'number') {
          totalUsedTime += item.used_time;
        }
      });
    }

    return {
      icon: 'lucide:book-open',
      iconClickUrl: `https://www.shanbay.com/main/user/${username}`,
      title: '扇贝单词',
      titleClickUrl: `https://www.shanbay.com/main/user/${username}`,
      totalTitle: '今日学习时间',
      totalValue: `${totalUsedTime.toFixed(0)} 分钟`,
      value: hasCheckedIn ? '已打卡' : '未打卡',
      valueColor: hasCheckedIn ? '#3fb27f' : '#ff4d4f',
    };
  } catch (error) {
    console.error('Shanbay API error:', error);
    return {
      icon: 'lucide:book-open',
      title: '扇贝单词',
      totalTitle: '今日学习时间',
      totalValue: '0 分钟',
      value: '获取失败',
      valueColor: '#ff4d4f',
    };
  }
}
