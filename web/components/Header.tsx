import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon, UserIcon } from '@heroicons/react/24/outline'
import { useAdminMode } from '@/hooks/useAdminMode'

export default function Header() {
  const { data: session, status } = useSession()
  const { isActualAdmin, isAdminModeActive, isAdminModeDisabled, toggleAdminMode } = useAdminMode()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ・タイトル */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-indigo-600">
                🏗️
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  VRChat謎解きワールド
                </h1>
                <p className="text-xs text-gray-600">
                  エクスプローラー
                </p>
              </div>
            </Link>
          </div>

          {/* ナビゲーション・ユーザーメニュー */}
          <div className="flex items-center space-x-4">
            {/* 検索・フィルター（将来の拡張用） */}
            <nav className="hidden md:flex space-x-6">
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                ワールド一覧
              </Link>
              <Link 
                href="/timeline" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                📅 年代別
              </Link>
              {session && (
                <Link 
                  href="/evaluation" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  評価管理
                </Link>
              )}
            </nav>

            {/* ユーザー認証 */}
            <div className="flex items-center">
              {status === 'loading' ? (
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : session ? (
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center space-x-2 text-sm rounded-full bg-gray-100 p-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {session.user?.image ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={session.user.image}
                        alt={session.user.name || 'ユーザー'}
                      />
                    ) : (
                      <UserIcon className="h-6 w-6 text-gray-600" />
                    )}
                    <span className="hidden md:block text-gray-700">
                      {session.user?.name}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                          <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                            <p className="font-medium">{session.user?.name}</p>
                            <p className="text-gray-500">{session.user?.email}</p>
                            {isActualAdmin && (
                              <p className="text-xs text-red-600 font-medium mt-1">
                                🔐 管理者{!isAdminModeActive && '（一時的にオフ）'}
                              </p>
                            )}
                          </div>
                        )}
                      </Menu.Item>
                      
                      {/* 管理者メニュー */}
                      {isAdminModeActive && (
                        <>
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/admin"
                                className={`${
                                  active ? 'bg-red-50' : ''
                                } flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:text-red-700`}
                              >
                                <span className="text-base">🔧</span>
                                <span>管理ダッシュボード</span>
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/admin/worlds"
                                className={`${
                                  active ? 'bg-red-50' : ''
                                } flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:text-red-700`}
                              >
                                <span className="text-base">🌍</span>
                                <span>ワールド管理</span>
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/admin/tags"
                                className={`${
                                  active ? 'bg-red-50' : ''
                                } flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:text-red-700`}
                              >
                                <span className="text-base">🏷️</span>
                                <span>タグ管理</span>
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/admin/world-tags"
                                className={`${
                                  active ? 'bg-red-50' : ''
                                } flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:text-red-700`}
                              >
                                <span className="text-base">🏷️</span>
                                <span>ワールドタグ管理</span>
                              </Link>
                            )}
                          </Menu.Item>
                          <div className="border-b border-gray-100 my-1"></div>
                        </>
                      )}

                      {/* 管理者モードがオフの場合の復帰ボタン */}
                      {isActualAdmin && isAdminModeDisabled && (
                        <>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={toggleAdminMode}
                                className={`${
                                  active ? 'bg-green-50' : ''
                                } flex items-center space-x-2 px-4 py-2 text-sm text-green-600 hover:text-green-700 w-full text-left`}
                              >
                                <span className="text-base">🔓</span>
                                <span>管理者モードに戻る</span>
                              </button>
                            )}
                          </Menu.Item>
                          <div className="border-b border-gray-100 my-1"></div>
                        </>
                      )}
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                          >
                            サインアウト
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  サインイン
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
