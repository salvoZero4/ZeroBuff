import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function SignIn() {
  return (
    <View>
      <Text>SignIn</Text>
      <Link href="/(auth)/sign-up">Sign Up</Link>
    </View>
  );
}
