"use client";

export default function AgreementsPage() {
  return (
    <main className="mx-auto max-w-3xl px-3 pb-10 pt-6 sm:px-4 sm:pb-12 sm:pt-8">
      <div className="card mx-auto space-y-4 bg-white/90 text-[#2f2a2a]">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-[#2f2a2a] hover:border-accent sm:hidden"
              onClick={() => (window.location.href = "/register")}
              aria-label="返回注册"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <h2 className="text-xl font-extrabold sm:text-2xl">使用协议与隐私声明</h2>
          </div>
          <button
            className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-[#2f2a2a] hover:border-accent"
            onClick={() => (window.location.href = "/register")}
          >
            返回注册
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed">
          <h3 className="text-lg font-bold text-[#2f2a2a]">一、账号与服务</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>注册账号需提供真实、有效的昵称、性别、年龄等基本信息。</li>
            <li>请妥善保管登录密码，因个人保管不当造成的风险由用户自行承担。</li>
            <li>不得发布违法、欺诈、骚扰或侵犯他人权益的内容，一经发现将限制或终止账号。</li>
          </ul>

          <h3 className="text-lg font-bold text-[#2f2a2a]">二、信息收集与使用</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>我们会收集您在注册和使用过程中填写的基本资料、头像、兴趣偏好等信息，用于匹配和展示。</li>
            <li>设备信息、日志信息仅用于安全、反作弊和产品优化，不会用于与匹配无关的商业目的。</li>
            <li>未经您同意，不会向无关第三方出售或出租您的个人信息。</li>
          </ul>

          <h3 className="text-lg font-bold text-[#2f2a2a]">三、信息共享与公开</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>与匹配/消息功能相关的必要信息会向对方展示，例如昵称、头像、基础标签。</li>
            <li>如因法律法规、执法机构要求，可能在法定范围内披露必要信息。</li>
          </ul>

          <h3 className="text-lg font-bold text-[#2f2a2a]">四、数据存储与安全</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>数据采用加密传输与权限控制，重要字段进行脱敏或加密存储。</li>
            <li>如发现账号异常登录、违规内容，将进行提醒、限制或下线处理。</li>
          </ul>

          <h3 className="text-lg font-bold text-[#2f2a2a]">五、未成年人保护</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>本服务仅面向年满 18 周岁的成年人，未满 18 周岁不得注册或使用。</li>
          </ul>

          <h3 className="text-lg font-bold text-[#2f2a2a]">六、注销与更正</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>您可通过设置或联系客服申请更正、导出或注销账号，相关数据将在法定或业务必要期限后删除或匿名化。</li>
          </ul>

          <h3 className="text-lg font-bold text-[#2f2a2a]">七、信息开放性</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>我们不会向任何无关个人或组织开放、出售或出租您的信息，除非基于法律法规或执法机关的强制要求。</li>
          </ul>

          <h3 className="text-lg font-bold text-[#2f2a2a]">八、更新</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>本协议和隐私声明可能更新，重大变更将以站内通知或弹窗形式提示，请及时关注。</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
