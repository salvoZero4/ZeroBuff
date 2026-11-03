Pod::Spec.new do |s|
  s.name = 'ZeroBuffRestTimer'
  s.version = '1.0.0'
  s.summary = 'System-rendered workout rest timer and native actions'
  s.description = 'Local timer only; no polling, background service or remote push.'
  s.author = 'ZeroBuff'
  s.homepage = 'https://github.com/zerobuff'
  s.license = { :type => 'MIT' }
  s.platforms = { :ios => '16.4' }
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'RNNotifee'
  s.source_files = '*.swift'
  s.frameworks = 'ActivityKit', 'AppIntents', 'UserNotifications', 'SwiftUI'
  s.swift_version = '5.9'
end
