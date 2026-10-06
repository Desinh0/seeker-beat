import { Redirect } from 'expo-router';

export default function NotificationClick() {
  // Незаметно перенаправляем пользователя на главный экран при клике на уведомление
  return <Redirect href="/" />;
}