import { View, Text } from "react-native";
import { Link } from "expo-router";
export default function SignUp() {
  return (
    <View>
      <Text>SignUp</Text>
      <Link href="/(auth)/sign-in">Sign In</Link>
    </View>
  );
}
